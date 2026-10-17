{
	"translatorID": "9a539dde-611a-4f4c-b09d-f29ae763a7c5",
	"label": "Amnesty International",
	"creator": "Vera de Kok",
	"target": "^https?://(www\\.)?amnesty\\.org/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-10-16 20:26:52"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2026 Vera de Kok

	This file is part of Zotero.

	Zotero is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	Zotero is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
	GNU Affero General Public License for more details.

	You should have received a copy of the GNU Affero General Public License
	along with Zotero. If not, see <http://www.gnu.org/licenses/>.

	***** END LICENSE BLOCK *****
*/


function detectWeb(doc, url) {
	let type = pageType(url, doc);
	if (type) return type;
	if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}


// Press releases are organisation statements, not journalism: Zotero's `report` fits them
// (Amnesty is the institution, there is no journalist), and so does the repo convention
// (Citavi 5 XML.js maps PressRelease to report).
function isPressReleaseURL(url) {
	return /\/(?:latest\/)?press-releases?\/|for-media\//i.test(url);
}


// /en/documents/ASA13/007/2013/en/ is a report landing page carrying its own date and index
// number; /en/library/info/ and /en/report/info/ serve the same page shape for older items.
function isDocumentURL(url) {
	return /\/(?:documents\/[a-z]{3}\d{2}\/\d{3}\/\d{4}\/|library\/info\/|report\/info\/)/i.test(url);
}


function isArticleURL(url) {
	return /\/latest\/(?:news|research|impact|campaigns|stories)\/\d{4}\/\d{2}\//.test(url);
}


function pageType(url, doc) {
	if (isPressReleaseURL(url) || isDocumentURL(url)) return 'report';
	if (isArticleURL(url) || (doc && doc.querySelector('h1.article-title'))) {
		return 'newspaperArticle';
	}
	return false;
}


function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('h2.post-title a');
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(row.textContent);
		if (!href || !title || !pageType(href)) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}


// "By Ousmane Diallo, Sahel researcher at Amnesty International"
//   -> naam = "Ousmane Diallo", functietitel = "Sahel researcher at Amnesty International"
// "Par"/"Por"/"بواسطة" zijn de Franse/Spaanse/Arabische varianten; zonder komma is er geen titel.
const BYLINE_RE = /^\s*(?:by|par|por|door|von|بواسطة|من)\s+(.+?)(?:\s*,\s*(.+?))?\s*$/i;
// ES/AR-OpEds signeren in de body ("Por NAAM,rol") in plaats van in een byline-container.
// "من" ("van/uit") opent daar ook gewone zinnen, dus die alleen in de container toestaan.
const BODY_BYLINE_RE = /^\s*(?:by|par|por|door|von|بقلم|بواسطة)\s+(.+?)(?:\s*,\s*(.+?))?\s*$/i;
const ORG_RE = /^(?:amnesty international|amnistía internacional|amnesty|the secretariat|international secretariat|العفو الدولية)/i;


function parseByline(text, re) {
	let m = (re || BYLINE_RE).exec(text);
	if (!m) return null;
	let name = ZU.trimInternal(m[1]);
	let role = m[2] ? ZU.trimInternal(m[2]) : '';
	if (!name) return null;
	// "Amnesty International" is geen auteur maar de organisatie: de functietitel is dan de
	// bron, en Zotero wil dat als uitgever - laat EM dat zelf zetten.
	if (ORG_RE.test(name) && !role) return null;
	return { name, role };
}


// ES/AR hebben geen byline-container: de ondertekenaar staat als korte vette cursiefregel
// onder de kop, en de rol bevat zelf komma's ("Por NAAM,activista, miembro de ...").
const NAME_PARTICLES = /^(?:van|von|der|den|de|del|della|di|da|dos|das|bin|ibn|al|el|la|le)$/i;
// Organisaties ondertekenen ook ("Por Amnistía Internacional", "بواسطة منظمة العفو الدولية, قسم الإعلام").
const NON_PERSON_RE = /\b(?:منظمة|مؤسسة|قسم|إدارة|international|internacional|association|asociación|foundation|fundación|committee|comité|office|oficina|team|equipo|secretariat|secretaría)\b/i;

function looksLikePersonName(name) {
	let words = name.split(/\s+/).filter(Boolean);
	if (words.length < 2 || words.length > 6) return false;
	if (NON_PERSON_RE.test(name)) return false;
	// Latijns schrift: elk woord met hoofdletter, op tussenvoegsels na ("Por la mañana" valt af)
	if (/[A-Za-zÀ-ÿ]/.test(name)) {
		return words.every(w => /^[A-ZÀ-Þ]/.test(w) || NAME_PARTICLES.test(w));
	}
	return name.length >= 5;
}


function parseBodyByline(doc) {
	for (let p of ZU.xpath(doc, '//p[strong or em]')) {
		let text = ZU.trimInternal(p.textContent || '');
		if (!text || text.split(/\s+/).length > 25) continue;
		let parsed = parseByline(text, BODY_BYLINE_RE);
		if (parsed && looksLikePersonName(parsed.name)) return parsed;
	}
	return null;
}


async function doWeb(doc, url) {
	if (getSearchResults(doc, true) && !pageType(url, doc)) {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (!items) return;
		for (let itemUrl of Object.keys(items)) {
			await scrape(await requestDocument(itemUrl));
		}
	}
	else {
		await scrape(doc, url);
	}
}


// "Index Number: ASA 13/007/2013" -> "ASA 13/007/2013"; the page also repeats it inline
function getIndexNumber(doc) {
	let meta = ZU.xpathText(doc, '//*[contains(@class, "article-meta")]');
	let m = meta && /Index Number:?\s*([A-Z]{2,4})\s*(\d{2})\/(\d{3,4})\/(\d{4})/.exec(meta.replace(/\u00a0/g, ' '));
	return m ? `${m[1]} ${m[2]}/${m[3]}/${m[4]}` : '';
}


async function scrape(doc, url = doc.location.href) {
	let type = pageType(url, doc) || 'newspaperArticle';
	let translator = Zotero.loadTranslator('web');
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48'); // Embedded Metadata
	translator.setDocument(doc);
	translator.setHandler('itemDone', (_obj, item) => {
		item.itemType = type;
		// EM laat de ISO-tijd staan; Zotero wil alleen de dag.
		let m = /^(\d{4}-\d{2}-\d{2})/.exec(item.date || '');
		if (m) item.date = m[1];
		// door EM afgeleide korte titel ("Türkiye", "In Mali, ...") is geen echte ondertitel
		item.shortTitle = '';
		// EM zet de volledige bylinetekst als organisatie-auteur; vervangen door de persoon
		// (of weghalen als het echt de organisatie is).
		let byline = ZU.xpathText(doc, '//div[contains(@class, "bylineContainer")]//span[1]')
			|| ZU.xpathText(doc, '//div[contains(@class, "authorInfoContainer")]//span[1]');
		let parsed = byline ? parseByline(byline) : parseBodyByline(doc);
		if (parsed) {
			item.creators = [Zotero.Utilities.cleanAuthor(parsed.name, 'author', false)];
			// Alleen de container levert een functietitel. In ES/AR staat de handtekening als
			// één zin ("Por NAAM,rol ...") in de body; dat als "Byline role" wegzetten zou een
			// veld suggereren dat de pagina niet heeft, dus daar alleen de naam.
			if (parsed.role && byline) {
				item.extra = (item.extra ? item.extra + '\n' : '') + 'Byline role: ' + parsed.role;
			}
		}
		else if (!byline) {
			// geen byline op de pagina -> geen gefabriceerde organisatie-auteur
			item.creators = [];
		}
		item.publicationTitle = 'Amnesty International';
		if (type === 'report') {
			// report heeft geen publicationTitle; de organisatie hoort bij institution/publisher.
			delete item.publicationTitle;
			item.institution = 'Amnesty International';
			item.publisher = 'Amnesty International';
			item.reportType = isPressReleaseURL(url) ? 'Press release' : 'Report';
			let indexNumber = getIndexNumber(doc);
			if (indexNumber) item.reportNumber = indexNumber;
			item.creators = [];
		}
		// de site is meertalig: /en/, /fr/, /es/, /ar/ ... -> taal uit <html lang>
		item.language = attr(doc, 'html', 'lang') || 'en';
		item.url = attr(doc, 'link[rel="canonical"]', 'href') || url;
		item.complete();
	});
	await translator.translate();
}

/*
	Byline-density check (2026-10-20): of the 60 most recent articles across all five
	/latest/ sections (news, research, impact, campaigns, education), only ONE carries
	a byline (the Mali/Wagner op-ed below). Press releases and reports have no human
	author; the translator must leave creators empty for those rather than letting
	Embedded Metadata fabricate an organization author from the byline container.
*/
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.amnesty.org/en/latest/news/2026/10/mali-wagner-impunity/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "In Mali, from the Wagner Group to Africa Corps: Will Impunity Continue?",
				"creators": [
					{
						"firstName": "Ousmane",
						"lastName": "Diallo",
						"creatorType": "author"
					}
				],
				"date": "2026-10-14",
				"abstractNote": "Ousmane Diallo, Sahel researcher at Amnesty International, warns of the ongoing killings, torture, and possible war crimes in Mali.",
				"extra": "Byline role: Sahel researcher at Amnesty International",
				"language": "en",
				"libraryCatalog": "www.amnesty.org",
				"publicationTitle": "Amnesty International",
				"url": "https://www.amnesty.org/en/latest/news/2026/10/mali-wagner-impunity/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
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
		"url": "https://www.amnesty.org/fr/latest/news/2026/10/mali-wagner-impunity/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Tribune : du groupe Wagner à l’Africa Corps, la continuité de l’impunité ?",
				"creators": [
					{
						"firstName": "Ousmane",
						"lastName": "Diallo",
						"creatorType": "author"
					}
				],
				"date": "2026-10-14",
				"abstractNote": "Ousmane Diallo, chercheur, alerte sur la persistance des meurtres, tortures et possibles crimes de guerre commis au Mali.",
				"extra": "Byline role: Chercheur senior sur le Sahel à Amnesty International",
				"language": "fr",
				"libraryCatalog": "www.amnesty.org",
				"publicationTitle": "Amnesty International",
				"url": "https://www.amnesty.org/fr/latest/news/2026/10/mali-wagner-impunity/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
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
		"url": "https://www.amnesty.org/en/latest/news/2026/10/turkiye-police-raid-and-state-takeover-of-opposition-tv-channel-a-brutal-blow-to-media-freedom/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Türkiye: Police raid and state takeover of opposition TV channel ‘a brutal blow to media freedom’",
				"creators": [],
				"date": "2026-10-14",
				"abstractNote": "Reacting to a police raid of the headquarters of Halk TV, one of Türkiye’s few broadcasters not aligned with the government, and the appointment of a trustee manager to oversee it as part of an investigation into alleged corruption, Esther Major, Amnesty International’s Deputy Regional Director for Europe, said:  “This alarming move is a brutal blow to […]",
				"language": "en",
				"libraryCatalog": "www.amnesty.org",
				"publicationTitle": "Amnesty International",
				"url": "https://www.amnesty.org/en/latest/news/2026/10/turkiye-police-raid-and-state-takeover-of-opposition-tv-channel-a-brutal-blow-to-media-freedom/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
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
		"url": "https://www.amnesty.org/es/latest/news/2026/10/oped-365-dias-sin-respuesta-la-impunidad-como-cicatriz/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "OpEd: 365 días sin respuesta: la impunidad como cicatriz",
				"creators": [
					{
						"firstName": "Yendri",
						"lastName": "Velásquez",
						"creatorType": "author"
					}
				],
				"date": "2026-10-13",
				"abstractNote": "Un año después del atentado que casi acaba con su vida, Yendri Velásquez; activista venezolano; sigue preguntándose: ¿Quién intentó matarles y por qué?",
				"language": "es",
				"libraryCatalog": "www.amnesty.org",
				"publicationTitle": "Amnesty International",
				"url": "https://www.amnesty.org/es/latest/news/2026/10/oped-365-dias-sin-respuesta-la-impunidad-como-cicatriz/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
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
		"url": "https://www.amnesty.org/en/latest/news/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.amnesty.org/es/latest/news/2026/10/saudi-arabia-yemen-civilians-must-not-pay-the-price-of-escalation-in-hostilities/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Arabia Saudí/Yemen: La población civil no debe pagar el precio de la escalada de las hostilidades Arabia Saudí/Yemen: La población civil no debe pagar el precio de la escalada de las hostilidades",
				"creators": [],
				"date": "2026-10-14",
				"abstractNote": "Ante la brusca escalada de las hostilidades armadas entre las autoridades huzíes de facto, el gobierno yemení y Arabia Saudí en las últimas semanas y el número creciente de víctimas civiles en el contexto de los ataques en curso, Heba Morayef, directora regional de Amnistía Internacional para Oriente Medio y Norte de África, ha afirmado: […]",
				"language": "es",
				"libraryCatalog": "www.amnesty.org",
				"publicationTitle": "Amnesty International",
				"url": "https://www.amnesty.org/es/latest/news/2026/10/saudi-arabia-yemen-civilians-must-not-pay-the-price-of-escalation-in-hostilities/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
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
		"url": "https://www.amnesty.org/ar/latest/news/2026/10/iran-five-protest-related-arbitrary-executions-in-one-week-must-spur-global-action/",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "إيران: خمس عمليات إعدام تعسفية على خلفية الاحتجاجات خلال أسبوع واحد تستدعي تحرّكًا دوليًا",
				"creators": [],
				"date": "2026-10-13",
				"abstractNote": "تعليقًا على إعدام السلطات الإيرانية خمسة أشخاص تعسّفًا في غضون أسبوع واحد، بين 30 سبتمبر/أيلول و5 أكتوبر/تشرين الأول، على خلفية إدانتهم بتهم تتعلّق باحتجاجات يناير/كانون الثاني 2026، وهم علي همتي سيستاني، وعلي رضا رئيسي، وعلي رضا سباهي، ومجيد نيك أنديش، وسياوش جمشيدي خيرآبادي، وذلك إثر محاكمات فادحة الجور شابها التعذيب، قالت ديانا الطحاوي، نائبة مديرة […]",
				"language": "ar",
				"libraryCatalog": "www.amnesty.org",
				"publicationTitle": "Amnesty International",
				"url": "https://www.amnesty.org/ar/latest/news/2026/10/iran-five-protest-related-arbitrary-executions-in-one-week-must-spur-global-action/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
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
		"url": "https://www.amnesty.org/en/latest/press-release/2021/06/g7-support-for-pharma-monopolies-putting-millions-of-lives-at-risk/",
		"items": [
			{
				"itemType": "report",
				"title": "G7 support for pharma monopolies is putting millions of lives at risk",
				"creators": [],
				"date": "2021-06-10",
				"abstractNote": "The UK has administered twice as many vaccines as the entire African continent",
				"institution": "Amnesty International",
				"language": "en",
				"libraryCatalog": "www.amnesty.org",
				"reportType": "Press release",
				"url": "https://www.amnesty.org/en/latest/press-release/2021/06/g7-support-for-pharma-monopolies-putting-millions-of-lives-at-risk/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
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
		"url": "https://www.amnesty.org/en/documents/ASA13/007/2013/en/",
		"items": [
			{
				"itemType": "report",
				"title": "Bangladesh: Further information: Detained editor alleges torture",
				"creators": [],
				"date": "2013-04-19",
				"abstractNote": "Detained Bangladeshi newspaper editor Mahmudur Rahman was hospitalised on 18 April 2013. His lawyers say he was tortured in police custody. Blogger Asif Mohiudeen, arrested on 3 April for allegedly posting blasphemous comments online, remains in detention and at risk of torture.",
				"institution": "Amnesty International",
				"language": "en",
				"libraryCatalog": "www.amnesty.org",
				"reportNumber": "ASA 13/007/2013",
				"reportType": "Report",
				"url": "https://www.amnesty.org/en/documents/asa13/007/2013/en/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
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
		"url": "https://www.amnesty.org/en/library/info/EUR04/005/2008/en",
		"items": [
			{
				"itemType": "report",
				"title": "Georgia/Russia: Civilians in the line of fire: The Georgia-Russia conflict.",
				"creators": [],
				"date": "2008-11-18",
				"abstractNote": "From the onset of the five-day war between Georgia and Russia in the self-proclaimed republic of South Ossetia in August 2008 the conflicting parties failed to take necessary measures to protect civilians from the hostilities. In this report Amnesty International raises concerns that serious violations of both international human rights law and international humanitarian law […]",
				"institution": "Amnesty International",
				"language": "en",
				"libraryCatalog": "www.amnesty.org",
				"reportNumber": "EUR 04/005/2008",
				"reportType": "Report",
				"url": "https://www.amnesty.org/en/documents/eur04/005/2008/en/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
