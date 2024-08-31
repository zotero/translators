{
	"translatorID": "7d8e6337-3f52-4e8c-8915-95a2ec755b6c",
	"label": "Publications Office of the European Union",
	"creator": "Abe Jellinek",
	"target": "^https?://op\\.europa\\.eu/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-03-08 17:58:08"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2021 Abe Jellinek
	
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
	if (url.includes('/publication-detail/') && doc.querySelector('.col-doi')) {
		return "book";
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.search-results-items a.documentDetailLink');
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(row.innerText);
		if (!href || !title || !href.includes('/publication-detail/')) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (items) ZU.processDocuments(Object.keys(items), scrape);
		});
	}
	else {
		scrape(doc, url);
	}
}

function scrape(doc) {
	// we would ideally just grab the "Metadata RDF" file here, but it doesn't
	// give us RDF that Zotero can do anything with. the official metadata
	// service (opac.publications.europa.eu) doesn't seem especially reliable.
	// so we'll instead try ISBN and DOI.
	
	let language = doc.location.pathname.split('/')[1];
	let pdfLink = doc.querySelector(`a.download[data-language="${language}"]`)
		|| doc.querySelector(`a.download[data-language="en"]`)
		|| doc.querySelector(`a.download`);
	let search = Zotero.loadTranslator("search");
	
	let DOI = ZU.cleanDOI(text(doc, '.col-doi .detail-value'));

	let item;

	search.setHandler("translators", function (obj, translators) {
		search.setTranslator(translators);
		search.setHandler("itemDone", function (obj, lookupItem) {
			item = lookupItem;
			item.creators = [...doc.querySelectorAll('span[itemprop="author"]')]
				.map((span) => {
					let isIndividual = span.closest('.list-item-privateAuthors');
					if (isIndividual) {
						return ZU.cleanAuthor(span.innerText, 'author', true);
					}
					else {
						return {
							lastName: span.innerText,
							creatorType: 'author',
							fieldMode: 1
						};
					}
				});
			item.title = item.title.replace(/[.,:;]+$/, '');
			item.ISBN = text('.col-isbn .detail-value');
			item.libraryCatalog = item.publisher = text(doc,
				'.site-main-logo span.screen-readers-only'); // localized
			// sometimes there are separate catalogue numbers for the PDF and
			// paper versions, but grabbing the first (PDF) is fine; either one
			// brings up the same document in the catalog.
			item.callNumber = text(doc, '.col-catalogueNumber .detail-value');
			item.abstractNote = text('.visible-description')
				+ ' ' + text('.show-more-description');
			delete item.place;
			
			if (pdfLink) {
				item.attachments.push({
					url: pdfLink.dataset.uri || pdfLink.href,
					title: `Full Text PDF (${pdfLink.dataset.language})`,
					mimeType: "application/pdf"
				});
			}

			item.tags = [...doc.querySelectorAll('#document-info .list-item-themes a, #document-info .list-item-subject a')]
				.map(link => ({ tag: link.textContent.trim() }));
		});
		search.translate();
	});
	search.setHandler("done", function () {
		item.complete();
	});
	search.setSearch({ DOI });
	search.getTranslators();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://op.europa.eu/en/publication-detail/-/publication/670d0ea7-5f85-11eb-b487-01aa75ed71a1/language-en/format-PDF/source-210185261",
		"items": [
			{
				"itemType": "book",
				"title": "Housing affordability in Ireland",
				"creators": [
					{
						"lastName": "Directorate-General for Economic and Financial Affairs (European Commission)",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"firstName": "Maria Jose",
						"lastName": "Doval Tedin",
						"creatorType": "author"
					},
					{
						"firstName": "Violaine",
						"lastName": "Faubert",
						"creatorType": "author"
					}
				],
				"date": "2020",
				"ISBN": "9789279773907",
				"abstractNote": "This Economic Brief analyses the main drivers of housing prices in recent years and examines policy options to improve housing affordability. A decade of under-investment following a property crash in 2008 led to a decrease in the housing stock per capita in Ireland. Its composition also became inadequate to meet the increased demand for urban apartments. As a result of persistent housing shortages, house prices grew faster than household income and home affordability worsened, especially for low-income tenants and homebuyers living in and around Dublin. Macroprudential measures have helped curb house price inflation in the owner-occupied sector since 2018. By contrast, prices in the rental sector continued growing to levels well above those prior the 2008 crisis. The evolution of house prices after the COVID-19 pandemic will depend on the speed of the economic recovery. Lower house prices and uncertainty may reduce housing construction and worsen affordability. Increasing housing supply by scaling-up the construction of social housing, reducing the restrictiveness of rent legislation and the relatively high delivery cost of housing could improve affordability. The latter might entail curbing land price inflation, increasing the relatively low productivity of the construction sector and addressing skills shortages. In case of a sluggish recovery following the COVID-19 pandemic, this may be combined with a temporary use of housing subsidies so as to help stabilise house prices and avoid risks in the financial markets.",
				"callNumber": "KC-BE-18-029-EN-N",
				"language": "eng",
				"libraryCatalog": "Publications Office of the European Union",
				"publisher": "Publications Office of the European Union",
				"url": "https://data.europa.eu/doi/10.2765/528723",
				"attachments": [
					{
						"title": "Full Text PDF (en)",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Economy — Finance"
					},
					{
						"tag": "Ireland"
					},
					{
						"tag": "financial risk"
					},
					{
						"tag": "housing"
					},
					{
						"tag": "prices"
					},
					{
						"tag": "property leasing"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://op.europa.eu/en/publication-detail/-/publication/fe6641fd-93fb-11ea-aac4-01aa75ed71a1/language-en",
		"items": [
			{
				"itemType": "book",
				"title": "70th Anniversary of the Schuman Declaration: from the declaration of 9 May 1950 to the European Union",
				"creators": [
					{
						"lastName": "Representation in Luxembourg (European Commission)",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "2020",
				"ISBN": "9789276181743",
				"abstractNote": "The declaration made on 9 May 1950 by Robert Schuman (then French Foreign Minister) truly changed the course of European history. The power of his vision – inspired by his discussions with Jean Monnet – paved the way for a united Europe: an open-ended and constantly evolving process.",
				"callNumber": "ID-03-20-273-EN-N",
				"language": "eng",
				"libraryCatalog": "Publications Office of the European Union",
				"publisher": "Publications Office of the European Union",
				"shortTitle": "70th Anniversary of the Schuman Declaration",
				"url": "https://data.europa.eu/doi/10.2775/777816",
				"attachments": [
					{
						"title": "Full Text PDF (en)",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Construction of Europe"
					},
					{
						"tag": "history of Europe"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://op.europa.eu/sl/publication-detail/-/publication/2c30cce5-3660-11ee-bbbf-01aa75ed71a1",
		"items": [
			{
				"itemType": "book",
				"title": "Osnove prava Evropske unije",
				"creators": [
					{
						"lastName": "Generalni direktorat za komuniciranje (Evropska komisija)",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"firstName": "Klaus-Dieter",
						"lastName": "Borchardt",
						"creatorType": "author"
					}
				],
				"date": "2023",
				"ISBN": "9789276101437",
				"abstractNote": "Pravni red Evropske unije zaznamuje naše politično življenje in družbo. Posamezniki niso več le državljani svoje države, meščani ali občani; so tudi državljani EU. S priročnikom Osnove prava Evropske unije je prof. dr. Klaus-Dieter Borchardt ustvaril referenčno delo, v katerem so opisani tudi izvori evropskega projekta in njegov nadaljnji razvoj v pravni red. Priročnik je namenjen vsem bralkam in bralcem, ki se želijo seznaniti s strukturo Evropske unije in nosilnimi stebri evropskega pravnega reda.",
				"callNumber": "NA-03-19-655-SL-N",
				"language": "slv",
				"libraryCatalog": "Urad za publikacije Evropske unije",
				"publisher": "Urad za publikacije Evropske unije",
				"url": "https://data.europa.eu/doi/10.2775/100316",
				"attachments": [
					{
						"title": "Full Text PDF (sl)",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Evropa"
					},
					{
						"tag": "Zakonodaja in pravosodje"
					},
					{
						"tag": "evropsko sodelovanje"
					},
					{
						"tag": "institucija EU"
					},
					{
						"tag": "organ EU"
					},
					{
						"tag": "poglabljanje Evropske unije"
					},
					{
						"tag": "pravni red EU"
					},
					{
						"tag": "pravo EU"
					},
					{
						"tag": "pravo EU – nacionalno pravo"
					},
					{
						"tag": "pristojnost EU"
					},
					{
						"tag": "zgodovina Evrope"
					},
					{
						"tag": "širitev Evropske unije"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://op.europa.eu/en/publication-detail/-/publication/1c4561c7-7c54-11ee-99ba-01aa75ed71a1",
		"items": [
			{
				"itemType": "book",
				"title": "Guidelines on biodiversity-friendly afforestation, reforestation and tree planting",
				"creators": [
					{
						"lastName": "Directorate-General for Environment (European Commission)",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "2023",
				"ISBN": "9789268001103",
				"abstractNote": "Under the European Green Deal, the EU’s Biodiversity Strategy for 2030 tackles the protection and restoration of nature by making a number of specific commitments and setting several targets. Biodiversity-friendly practices for enhancing the quantity and quality of EU forests are also being promoted. The Biodiversity Strategy announced, among other objectives, guidelines on biodiversity-friendly afforestation, reforestation and tree planting. Among other things, these will contribute to the pledge to plant at least 3 billion additional trees in the EU by 2030, in full compliance with ecological principles. A roadmap to implement this pledge is included in the new EU Forest Strategy that was adopted in July 2021. In addition, these guidelines support the general EU agenda on biodiversity by contributing to our global commitments under the UN Convention on Biological Diversity. They would also support other key initiatives under the European Green Deal at implementation level, in particular the Nature Restoration Law, the Certification Framework for Carbon Removals and the Soil Mission.",
				"callNumber": "KH-07-23-101-EN-N",
				"language": "eng",
				"libraryCatalog": "Publications Office of the European Union",
				"publisher": "Publications Office of the European Union",
				"url": "https://data.europa.eu/doi/10.2779/731",
				"attachments": [
					{
						"title": "Full Text PDF (en)",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "EU strategy"
					},
					{
						"tag": "Environment — Ecology"
					},
					{
						"tag": "European forestry policy"
					},
					{
						"tag": "Forestry"
					},
					{
						"tag": "adaptation to climate change"
					},
					{
						"tag": "afforestation"
					},
					{
						"tag": "agroforestry"
					},
					{
						"tag": "biodiversity"
					},
					{
						"tag": "conservation of resources"
					},
					{
						"tag": "financing"
					},
					{
						"tag": "nature-based solution"
					},
					{
						"tag": "sustainable forest management"
					},
					{
						"tag": "terrestrial ecosystem"
					},
					{
						"tag": "town planning"
					},
					{
						"tag": "tree"
					},
					{
						"tag": "urban area"
					},
					{
						"tag": "user guide"
					},
					{
						"tag": "wooded area"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://op.europa.eu/en/search-results?p_p_id=eu_europa_publications_portlet_search_executor_SearchExecutorPortlet_INSTANCE_q8EzsBteHybf&p_p_lifecycle=1&p_p_state=normal&queryText=test&facet.collection=EUPub&startRow=1&resultsPerPage=10&SEARCH_TYPE=SIMPLE",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://op.europa.eu/en/publication-detail/-/publication/b5a7c9c6-4e01-11ee-9220-01aa75ed71a1/language-en/format-PDF/source-309009057",
		"items": [
			{
				"itemType": "book",
				"title": "The road to Paris: stress testing the transition towards a net zero economy : the energy transition through the lens of the second ECB economy wide climate stress test",
				"creators": [
					{
						"lastName": "European Central Bank",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"firstName": "Tina",
						"lastName": "Emambakhsh",
						"creatorType": "author"
					},
					{
						"firstName": "Maximilian",
						"lastName": "Fuchs",
						"creatorType": "author"
					},
					{
						"firstName": "Simon",
						"lastName": "Kördel",
						"creatorType": "author"
					},
					{
						"firstName": "Charalampos",
						"lastName": "Kouratzoglou",
						"creatorType": "author"
					},
					{
						"firstName": "Chiara",
						"lastName": "Lelli",
						"creatorType": "author"
					},
					{
						"firstName": "Riccardo",
						"lastName": "Pizzeghello",
						"creatorType": "author"
					},
					{
						"firstName": "Carmelo",
						"lastName": "Salleo",
						"creatorType": "author"
					},
					{
						"firstName": "Martina",
						"lastName": "Spaggiari",
						"creatorType": "author"
					}
				],
				"date": "2023",
				"ISBN": "9789289961578",
				"abstractNote": "The transition to a carbon-neutral economy is necessary to limit the negative impact of climate change and has become one of the world’s most urgent priorities. This paper assesses the impact of three potential transition pathways, differing in the timing and level of ambition of emission reductions, and quantifies the associated investment needs, economic costs and financial risks for corporates, households and financial institutions in the euro area. Building on the first ECB top-down, economy-wide climate stress test, this paper contributes to the field of climate stress testing by introducing three key innovations. First, the design of three short-term transition scenarios that combine the transition paths developed by the Network for Greening the Financial System (NGFS) with macroeconomic projections that account for the latest energy-related developments. Second, the introduction of granular sectoral dynamics and energy-specific considerations by country relevant to transition risk. Finally, this paper provides a comprehensive analysis of the impact of transition risk on the euro area private sector and on the financial system, using a granular dataset that combines climate, energy-related and financial information for millions of firms within the euro area credit register and securities database, and country-level data on households. By comparing different transition scenarios, the results of the exercise show that acting immediately and decisively would provide significant benefits for the euro area economy and financial system, not only by maintaining the optimal net-zero emissions path (and therefore limiting the physical impact of climate change), but also by limiting financial risk. An accelerated transition to a carbon-neutral economy would be helpful to contain risks for financial institutions and would not generate financial stability concerns for the euro area, provided that firms and households could finance their green investments in an orderly manner. However, the heterogeneous results across economic sectors and banks suggest that more careful monitoring of certain entities and subsets of credit exposures will be required during the transition process.",
				"callNumber": "QB-AQ-23-019-EN-N",
				"language": "eng",
				"libraryCatalog": "Publications Office of the European Union",
				"publisher": "Publications Office of the European Union",
				"shortTitle": "The road to Paris",
				"url": "https://data.europa.eu/doi/10.2866/49649",
				"attachments": [
					{
						"title": "Full Text PDF (en)",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Economy — Finance"
					},
					{
						"tag": "European Central Bank"
					},
					{
						"tag": "banking"
					},
					{
						"tag": "carbon neutrality"
					},
					{
						"tag": "corporate finance"
					},
					{
						"tag": "credit"
					},
					{
						"tag": "economic transition"
					},
					{
						"tag": "energy transition"
					},
					{
						"tag": "euro area"
					},
					{
						"tag": "financial institution"
					},
					{
						"tag": "financial risk"
					},
					{
						"tag": "financial stress test"
					},
					{
						"tag": "foresight"
					},
					{
						"tag": "household"
					},
					{
						"tag": "reduction of gas emissions"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
