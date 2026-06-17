{
	"translatorID": "850f4c5f-71fb-4669-b7da-7fb7a95500ef",
	"label": "Cambridge Core",
	"creator": "Sebastian Karcher",
	"target": "^https?://www\\.cambridge\\.org/core/(search\\?|journals/|books/|.+/listing?)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-11-20 15:43:05"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2016-2024 Sebastian Karcher

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
	// if one of these strings is in the URL, we're almost definitely on a listing
	// page and should immediately return "multiple" if the page contains any
	// results. the checks below (particularly url.includes('/books/')) might
	// falsely return true and lead to an incorrect detection if we continue.
	let multiples = /\/search\?|\/listing\?|\/issue\//;
	if (multiples.test(url) && getSearchResults(doc, true)) {
		return "multiple";
	}
	if (url.includes('/article/')) {
		return "journalArticle";
	}
	if (url.includes('/books/')) {
		if (doc.getElementsByClassName('chapter-wrapper').length > 0) {
			return "bookSection";
		}
		else return "book";
	}

	// now let's check for multiples again, just to be sure. this handles some
	// rare listing page URLs that might not be included in the multiples
	// regex above.
	if (getSearchResults(doc, true)) {
		return "multiple";
	}

	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll(
		'li.title a[href*="/article/"], li.title a[href*="/product/"], li.title a[href*="/books/"], div.results .product-listing-with-inputs-content a[href*="/books/"]'
	);
	for (let row of rows) {
		var href = row.href;
		var title = ZU.trimInternal(row.textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}


async function doWeb(doc, url) {
	if (detectWeb(doc, url) == 'multiple') {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (!items) return;
		for (let url of Object.keys(items)) {
			await scrape(await requestDocument(url));
		}
	}
	else {
		await scrape(doc, url);
	}
}


async function scrape(doc, url = doc.location.href) {
	// Book metadata is much better using RIS
	if (detectWeb(doc, url) == "book" || detectWeb(doc, url) == "bookSection") {
		let productID = url.replace(/[#?].*/, "").match(/\/([^/]+)$/)[1];
		let risURL
			= "/core/services/aop-easybib/export?exportType=ris&productIds="
			+ productID + "&citationStyle=apa";
		// Z.debug(risURL);
		// the attribute sometimes has a space in it, so testing for contains
		var pdfURL = ZU.xpathText(doc,
			'//meta[contains(@name, "citation_pdf_url")]/@content'
		);
		if (!pdfURL) {
			pdfURL = attr(doc, '.actions a[target="_blank"][href*=".pdf"]', 'href');
		}
		// Z.debug("pdfURL: " + pdfURL);
		var text = await requestText(risURL);
		var translator = Zotero.loadTranslator(
			"import");
		translator.setTranslator(
			"32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
		translator.setString(text);
		translator.setHandler("itemDone", function (obj,
			item) {
			if (pdfURL) {
				item.attachments.push({
					url: pdfURL,
					title: "Full Text PDF",
					mimeType: "application/pdf"
				});
			}
			item.attachments.push({
				title: "Snapshot",
				document: doc
			});
			// don't save Cambridge Core to archive
			item.archive = "";
			item.complete();
		});
		await translator.translate();
	}
	// Some elements of journal citations look better with EM
	else {
		let translator = Zotero.loadTranslator('web');
		// Embedded Metadata
		translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
		translator.setDocument(doc);
		
		translator.setHandler('itemDone', (_obj, item) => {
			item.url = url;
			var abstract = ZU.xpathText(doc,
				'//div[@class="abstract"]');
			if (abstract) {
				item.abstractNote = abstract;
			}
			item.title = ZU.unescapeHTML(item.title);
			item.publisher = ""; // don't grab the publisher
			item.libraryCatalog = "Cambridge University Press";
			if (item.date.includes("undefined")) {
				item.date = attr('meta[name="citation_online_date"]', "content");
			}
			// remove asterisk or 1 at end of title, e.g. https://www.cambridge.org/core/journals/american-political-science-review/article/abs/violence-in-premodern-societies-rural-colombia/A14B0BB4130A2BA6BE79E2853597526E
			const titleElem = doc.querySelector("#maincontent h1");
			if (titleElem.querySelector('a:last-child')) {
				item.title = titleElem.firstChild.textContent;
			}

			item.complete();
		});
		let em = await translator.getTranslatorObject();
		// TODO map additional meta tags here, or delete completely
		if (url.includes("/books")) {
			em.itemType = "book";
		}
		else {
			em.itemType = "journalArticle";
		}
		await em.doWeb(doc, url);
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.cambridge.org/core/journals/journal-of-american-studies/article/abs/samo-as-an-escape-clause-jean-michel-basquiats-engagement-with-a-commodified-american-africanism/1E4368D610A957B84F6DA3A58B8BF164",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "“SAMO© as an Escape Clause”: Jean-Michel Basquiat's Engagement with a Commodified American Africanism",
				"creators": [
					{
						"firstName": "Laurie A.",
						"lastName": "Rodrigues",
						"creatorType": "author"
					}
				],
				"date": "2011/05",
				"DOI": "10.1017/S0021875810001738",
				"ISSN": "1469-5154, 0021-8758",
				"abstractNote": "Heir to the racist configuration of the American art exchange and the delimiting appraisals of blackness in the American mainstream media, Jean-Michel Basquiat appeared on the late 1970s New York City street art scene – then he called himself “SAMO.” Not long thereafter, Basquiat grew into one of the most influential artists of an international movement that began around 1980, marked by a return to figurative painting. Given its rough, seemingly untrained and extreme, conceptual nature, Basquiat's high-art oeuvre might not look so sophisticated to the uninformed viewer. However, Basquiat's work reveals a powerful poetic and visual gift, “heady enough to confound academics and hip enough to capture the attention span of the hip hop nation,” as Greg Tate has remarked. As noted by Richard Marshall, Basquiat's aesthetic strength actually comes from his striving “to achieve a balance between the visual and intellectual attributes” of his artwork. Like Marshall, Tate, and others, I will connect with Basquiat's unique, self-reflexively experimental visual practices of signifying and examine anew Basquiat's active contribution to his self-alienation, as Hebdige has called it. Basquiat's aesthetic makes of his paintings economies of accumulation, building a productive play of contingency from the mainstream's constructions of race. This aesthetic move speaks to a need for escape from the perceived epistemic necessities of blackness. Through these economies of accumulation we see, as Tate has pointed out, Basquiat's “intellectual obsession” with issues such as ancestry/modernity, personhood/property and originality/origins of knowledge, driven by his tireless need to problematize mainstream media's discourses surrounding race – in other words, a commodified American Africanism.",
				"issue": "2",
				"language": "en",
				"libraryCatalog": "Cambridge University Press",
				"pages": "227-243",
				"publicationTitle": "Journal of American Studies",
				"shortTitle": "“SAMO© as an Escape Clause”",
				"url": "https://www.cambridge.org/core/journals/journal-of-american-studies/article/abs/samo-as-an-escape-clause-jean-michel-basquiats-engagement-with-a-commodified-american-africanism/1E4368D610A957B84F6DA3A58B8BF164",
				"volume": "45",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
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
		"url": "https://www.cambridge.org/core/journals/journal-of-fluid-mechanics/article/abs/high-resolution-simulations-of-cylindrical-density-currents/30D62864BDED84A6CC81F5823950767B",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "High-resolution simulations of cylindrical density currents",
				"creators": [
					{
						"firstName": "Mariano I.",
						"lastName": "Cantero",
						"creatorType": "author"
					},
					{
						"firstName": "S.",
						"lastName": "Balachandar",
						"creatorType": "author"
					},
					{
						"firstName": "Marcelo H.",
						"lastName": "Garcia",
						"creatorType": "author"
					}
				],
				"date": "2007/11",
				"DOI": "10.1017/S0022112007008166",
				"ISSN": "1469-7645, 0022-1120",
				"abstractNote": "Three-dimensional highly resolved simulations are presented for cylindrical density currents using the Boussinesq approximation for small density difference. Three Reynolds numbers (Re) are investigated (895, 3450 and 8950, which correspond to values of the Grashof number of 105, 1.5 × 106 and 107, respectively) in order to identify differences in the flow structure and dynamics. The simulations are performed using a fully de-aliased pseudospectral code that captures the complete range of time and length scales of the flow. The simulated flows present the main features observed in experiments at large Re. As the current develops, it transitions through different phases of spreading, namely acceleration, slumping, inertial and viscous Soon after release the interface between light and heavy fluids rolls up forming Kelvin–Helmholtz vortices. The formation of the first vortex sets the transition between acceleration and slumping phases. Vortex formation continues only during the slumping phase and the formation of the last Kelvin–Helmholtz vortex signals the departure from the slumping phase. The coherent Kelvin–Helmholtz vortices undergo azimuthal instabilities and eventually break up into small-scale turbulence. In the case of planar currents this turbulent region extends over the entire body of the current, while in the cylindrical case it only extends to the regions of Kelvin–Helmholtz vortex breakup. The flow develops three-dimensionality right from the beginning with incipient lobes and clefts forming at the lower frontal region. These instabilities grow in size and extend to the upper part of the front. Lobes and clefts continuously merge and split and result in a complex pattern that evolves very dynamically. The wavelength of the lobes grows as the flow spreads, while the local Re of the flow decreases. However, the number of lobes is maintained over time. Owing to the high resolution of the simulations, we have been able to link the lobe and cleft structure to local flow patterns and vortical structures. In the near-front region and body of the current several hairpin vortices populate the flow. Laboratory experiments have been performed at the higher Re and compared to the simulation results showing good agreement. Movies are available with the online version of the paper.",
				"language": "en",
				"libraryCatalog": "Cambridge University Press",
				"pages": "437-469",
				"publicationTitle": "Journal of Fluid Mechanics",
				"url": "https://www.cambridge.org/core/journals/journal-of-fluid-mechanics/article/abs/high-resolution-simulations-of-cylindrical-density-currents/30D62864BDED84A6CC81F5823950767B",
				"volume": "590",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Gravity currents"
					},
					{
						"tag": "Vortex breakdown"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.cambridge.org/core/journals/american-political-science-review/issue/F6F2E8238A6D139A91D343A62AB2CECC",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.cambridge.org/core/search?q=labor&sort=&aggs%5BonlyShowAvailable%5D%5Bfilters%5D=&aggs%5BopenAccess%5D%5Bfilters%5D=&aggs%5BproductTypes%5D%5Bfilters%5D=JOURNAL_ARTICLE&aggs%5BproductDate%5D%5Bfilters%5D=&aggs%5BproductSubject%5D%5Bfilters%5D=&aggs%5BproductJournal%5D%5Bfilters%5D=&aggs%5BproductPublisher%5D%5Bfilters%5D=&aggs%5BproductSociety%5D%5Bfilters%5D=&aggs%5BproductPublisherSeries%5D%5Bfilters%5D=&aggs%5BproductCollection%5D%5Bfilters%5D=&showJackets=&filters%5BauthorTerms%5D=&filters%5BdateYearRange%5D%5Bfrom%5D=&filters%5BdateYearRange%5D%5Bto%5D=&hideArticleGraphicalAbstracts=true",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.cambridge.org/core/books/conservation-research-policy-and-practice/making-a-difference-in-conservation-linking-science-and-policy/C8B7353BFDD77E0C1A16A61C07E44977",
		"items": [
			{
				"itemType": "bookSection",
				"title": "Making a difference in conservation: linking science and policy",
				"creators": [
					{
						"lastName": "Vickery",
						"firstName": "Juliet A.",
						"creatorType": "editor"
					},
					{
						"lastName": "Ockendon",
						"firstName": "Nancy",
						"creatorType": "editor"
					},
					{
						"lastName": "Pettorelli",
						"firstName": "Nathalie",
						"creatorType": "editor"
					},
					{
						"lastName": "Brotherton",
						"firstName": "Peter N. M.",
						"creatorType": "editor"
					},
					{
						"lastName": "Sutherland",
						"firstName": "William J.",
						"creatorType": "editor"
					},
					{
						"lastName": "Davies",
						"firstName": "Zoe G.",
						"creatorType": "editor"
					},
					{
						"lastName": "Sutherland",
						"firstName": "William J.",
						"creatorType": "author"
					},
					{
						"lastName": "Brotherton",
						"firstName": "Peter N. M.",
						"creatorType": "author"
					},
					{
						"lastName": "Ockendon",
						"firstName": "Nancy",
						"creatorType": "author"
					},
					{
						"lastName": "Pettorelli",
						"firstName": "Nathalie",
						"creatorType": "author"
					},
					{
						"lastName": "Vickery",
						"firstName": "Juliet A.",
						"creatorType": "author"
					},
					{
						"lastName": "Davies",
						"firstName": "Zoe G.",
						"creatorType": "author"
					}
				],
				"date": "2020",
				"ISBN": "9781108714587",
				"abstractNote": "Jamie Gundry’s dramatic image of a white-tailed eagle (Haliaeetus albicilla) on the cover of this book reflects the twisting changes in fortune experienced by this species, with a revival that can be attributed to a successful interplay of science, policy and practice. White-tailed eagles were historically much more widely distributed than they are today (Yalden, 2007), once breeding across much of Europe, but by the early twentieth century the species was extinct across much of western and southern Europe. The main cause of its decline was persecution by farmers and shepherds, who considered the eagles a threat to their livestock, but, along with other raptors, white-tailed eagles were also seriously affected by DDT in the 1960s and 1970s, which had disastrous effects on the breeding success of remaining populations.",
				"bookTitle": "Conservation Research, Policy and Practice",
				"extra": "DOI: 10.1017/9781108638210.001",
				"libraryCatalog": "Cambridge University Press",
				"pages": "3-8",
				"place": "Cambridge",
				"publisher": "Cambridge University Press",
				"series": "Ecological Reviews",
				"shortTitle": "Making a difference in conservation",
				"url": "https://www.cambridge.org/core/books/conservation-research-policy-and-practice/making-a-difference-in-conservation-linking-science-and-policy/C8B7353BFDD77E0C1A16A61C07E44977",
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
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.cambridge.org/core/books/conservation-research-policy-and-practice/22AB241C45F182E40FC7F13637485D7E",
		"items": [
			{
				"itemType": "book",
				"title": "Conservation Research, Policy and Practice",
				"creators": [
					{
						"lastName": "Sutherland",
						"firstName": "William J.",
						"creatorType": "editor"
					},
					{
						"lastName": "Brotherton",
						"firstName": "Peter N. M.",
						"creatorType": "editor"
					},
					{
						"lastName": "Davies",
						"firstName": "Zoe G.",
						"creatorType": "editor"
					},
					{
						"lastName": "Ockendon",
						"firstName": "Nancy",
						"creatorType": "editor"
					},
					{
						"lastName": "Pettorelli",
						"firstName": "Nathalie",
						"creatorType": "editor"
					},
					{
						"lastName": "Vickery",
						"firstName": "Juliet A.",
						"creatorType": "editor"
					}
				],
				"date": "2020",
				"ISBN": "9781108714587",
				"abstractNote": "Conservation research is essential for advancing knowledge but to make an impact scientific evidence must influence conservation policies, decision making and practice. This raises a multitude of challenges. How should evidence be collated and presented to policymakers to maximise its impact? How can effective collaboration between conservation scientists and decision-makers be established? How can the resulting messages be communicated to bring about change? Emerging from a successful international symposium organised by the British Ecological Society and the Cambridge Conservation Initiative, this is the first book to practically address these questions across a wide range of conservation topics. Well-renowned experts guide readers through global case studies and their own experiences. A must-read for practitioners, researchers, graduate students and policymakers wishing to enhance the prospect of their work 'making a difference'. This title is also available as Open Access on Cambridge Core.",
				"extra": "DOI: 10.1017/9781108638210",
				"libraryCatalog": "Cambridge University Press",
				"place": "Cambridge",
				"publisher": "Cambridge University Press",
				"series": "Ecological Reviews",
				"url": "https://www.cambridge.org/core/books/conservation-research-policy-and-practice/22AB241C45F182E40FC7F13637485D7E",
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
		"url": "https://www.cambridge.org/core/what-we-publish/books/listing?sort=canonical.date%3Adesc&aggs%5BonlyShowAvailable%5D%5Bfilters%5D=true&aggs%5BproductTypes%5D%5Bfilters%5D=BOOK%2CELEMENT&searchWithinIds=0C5182F27A492FDC81EDF8D3C53266B5",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.cambridge.org/core/journals/ajs-review/latest-issue",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.cambridge.org/core/journals/american-political-science-review/article/abs/violence-in-premodern-societies-rural-colombia/A14B0BB4130A2BA6BE79E2853597526E",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Violence in Pre-Modern Societies: Rural Colombia",
				"creators": [
					{
						"firstName": "Richard S.",
						"lastName": "Weinert",
						"creatorType": "author"
					}
				],
				"date": "1966/06",
				"DOI": "10.2307/1953360",
				"ISSN": "0003-0554, 1537-5943",
				"abstractNote": "Violence is a common phenomenon in developing polities which has received little attention. Clearly a Peronist riot in Buenos Aires, a land invasion in Lima, and a massacre in rural Colombia are all different. Yet we have no typology which relates types of violence to stages or patterns of economic or social development. We know little of the causes, incidence or functions of different forms of violence. This article is an effort to understand one type of violence which can occur in societies in transition.Violence in Colombia has traditionally accompanied transfers of power at the national level. This can account for its outbreak in 1946, when the Conservative Party replaced the Liberals. It cannot account for the intensity or duration of rural violence for two decades. This article focuses primarily on the violence from 1946 to 1953, and explains its intensification and duration as the defense of a traditional sacred order against secular modernizing tendencies undermining that order. We shall discuss violence since 1953 in the concluding section.",
				"issue": "2",
				"language": "en",
				"libraryCatalog": "Cambridge University Press",
				"pages": "340-347",
				"publicationTitle": "American Political Science Review",
				"shortTitle": "Violence in Pre-Modern Societies",
				"url": "https://www.cambridge.org/core/journals/american-political-science-review/article/abs/violence-in-premodern-societies-rural-colombia/A14B0BB4130A2BA6BE79E2853597526E",
				"volume": "60",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
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
		"url": "https://www.cambridge.org/core/journals/journal-of-public-policy/article/abs/when-consumers-oppose-consumer-protection-the-politics-of-regulatory-backlash/2C8E6B9BB6881A233B8936D9AD2C6305",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "When Consumers Oppose Consumer Protection: The Politics of Regulatory Backlash",
				"creators": [
					{
						"firstName": "David",
						"lastName": "Vogel",
						"creatorType": "author"
					}
				],
				"date": "1990/10",
				"DOI": "10.1017/S0143814X00006085",
				"ISSN": "1469-7815, 0143-814X",
				"abstractNote": "This article examines a neglected phenomenon in the existing literature on social regulation, namely political opposition to regulation that comes not from business but from consumers. It examines four cases of successful grass-roots consumer opposition to government health and safety regulations in the United States. Two involve rules issued by the National Highway Traffic Safety Administration, a 1974 requirement that all new automobiles be equipped with an engine-interlock system, and a 1967 rule that denied federal highway funds to states that did not require motorcyclists to wear a helmet. In 1977, Congress overturned the Food and Drug Administration's ban on the artificial sweetener, saccharin. Beginning in 1987, the FDA began to yield to pressures from the gay community by agreeing to streamline its procedures for the testing and approval of new drugs designed to fight AIDS and other fatal diseases. The article identifies what these regulations have in common and examines their significance for our understanding the politics of social regulation in the United States and other industrial nations.",
				"issue": "4",
				"language": "en",
				"libraryCatalog": "Cambridge University Press",
				"pages": "449-470",
				"publicationTitle": "Journal of Public Policy",
				"shortTitle": "When Consumers Oppose Consumer Protection",
				"url": "https://www.cambridge.org/core/journals/journal-of-public-policy/article/abs/when-consumers-oppose-consumer-protection-the-politics-of-regulatory-backlash/2C8E6B9BB6881A233B8936D9AD2C6305",
				"volume": "10",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
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
		"url": "https://www.cambridge.org/core/journals/american-political-science-review/firstview",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.cambridge.org/core/books/foundations-of-probabilistic-programming/819623B1B5B33836476618AC0621F0EE",
		"items": [
			{
				"itemType": "book",
				"title": "Foundations of Probabilistic Programming",
				"creators": [
					{
						"lastName": "Barthe",
						"firstName": "Gilles",
						"creatorType": "editor"
					},
					{
						"lastName": "Katoen",
						"firstName": "Joost-Pieter",
						"creatorType": "editor"
					},
					{
						"lastName": "Silva",
						"firstName": "Alexandra",
						"creatorType": "editor"
					}
				],
				"date": "2020",
				"ISBN": "9781108488518",
				"abstractNote": "What does a probabilistic program actually compute? How can one formally reason about such probabilistic programs? This valuable guide covers such elementary questions and more. It provides a state-of-the-art overview of the theoretical underpinnings of modern probabilistic programming and their applications in machine learning, security, and other domains, at a level suitable for graduate students and non-experts in the field. In addition, the book treats the connection between probabilistic programs and mathematical logic, security (what is the probability that software leaks confidential information?), and presents three programming languages for different applications: Excel tables, program testing, and approximate computing. This title is also available as Open Access on Cambridge Core.",
				"extra": "DOI: 10.1017/9781108770750",
				"libraryCatalog": "Cambridge University Press",
				"place": "Cambridge",
				"publisher": "Cambridge University Press",
				"url": "https://www.cambridge.org/core/books/foundations-of-probabilistic-programming/819623B1B5B33836476618AC0621F0EE",
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
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
