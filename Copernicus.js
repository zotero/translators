{
	"translatorID": "8082115d-5bc6-4517-a4e8-abed1b2a784a",
	"label": "Copernicus",
	"creator": "Abe Jellinek",
	"target": "^https?://[^./]+\\.copernicus\\.org/",
	"minVersion": "2.1",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-01-25 15:59:41"
}

/*
    ***** BEGIN LICENSE BLOCK *****

    Copyright © 2022 Abe Jellinek

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
	if (url.includes('/articles/')
			&& (url.endsWith('.pdf') || attr('meta[name="citation_title"]', 'content'))) {
		return 'journalArticle';
	}
	else if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('a.article-title');
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(row.textContent);
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
		if (items) {
			await Promise.all(
				Object.keys(items)
					.map(url => requestDocument(url).then(scrape))
			);
		}
	}
	else if (url.endsWith('.pdf')) {
		await scrape(await requestDocument(url.replace('.pdf', '.html')));
	}
	else {
		await scrape(doc, url);
	}
}

async function scrape(doc, url = doc.location.href) {
	let translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	
	translator.setHandler('itemDone', (_obj, item) => {
		item.title = item.title.replace(/''/g, '"');
		if (item.abstractNote) {
			item.abstractNote = ZU.cleanTags(item.abstractNote).replace(/^Abstract\./, '');
		}
		if (item.date) {
			item.date = ZU.strToISO(item.date);
		}
		item.libraryCatalog = 'Copernicus Online Journals';
		item.complete();
	});

	let em = await translator.getTranslatorObject();
	em.itemType = 'journalArticle';
	await em.doWeb(doc, url);
}


/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://adgeo.copernicus.org/articles/30/1/2011/adgeo-30-1-2011.html",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Preface \"Precipitation: Measurement, Climatology, Remote Sensing, and Modeling (EGU 2010)\"",
				"creators": [
					{
						"firstName": "S.",
						"lastName": "Michaelides",
						"creatorType": "author"
					},
					{
						"firstName": "S.",
						"lastName": "Athanasatos",
						"creatorType": "author"
					}
				],
				"date": "2011-05-09",
				"DOI": "10.5194/adgeo-30-1-2011",
				"ISSN": "1680-7340",
				"language": "English",
				"libraryCatalog": "Copernicus Online Journals",
				"pages": "1-2",
				"publicationTitle": "Advances in Geosciences",
				"shortTitle": "Preface \"Precipitation",
				"url": "https://adgeo.copernicus.org/articles/30/1/2011/adgeo-30-1-2011.html",
				"volume": "30",
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
		"url": "https://ars.copernicus.org/articles/6/1/2008/ars-6-1-2008.html",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Time domain reflectrometry measurements using a movable obstacle for the determination of dielectric profiles",
				"creators": [
					{
						"firstName": "B.",
						"lastName": "Will",
						"creatorType": "author"
					},
					{
						"firstName": "M.",
						"lastName": "Gerding",
						"creatorType": "author"
					},
					{
						"firstName": "S.",
						"lastName": "Schultz",
						"creatorType": "author"
					},
					{
						"firstName": "B.",
						"lastName": "Schiek",
						"creatorType": "author"
					}
				],
				"date": "2008-05-26",
				"DOI": "10.5194/ars-6-1-2008",
				"ISSN": "1684-9965",
				"abstractNote": "Microwave techniques for the measurement of the permittivity of soils including the water content of soils and other materials, especially TDR (time domain reflectometry), have become accepted as routine measurement techniques. This summary deals with an advanced use of the TDR principle for the determination of the water content of soil along a probe. The basis of the advanced TDR technique is a waveguide, which is inserted into the soil for obtaining measurements of the effective soil permittivity, from which the water content is estimated, and an obstacle, which can mechanically be moved along the probe and which acts as a reference reflection for the TDR system with an exactly known position. Based on the known mechanical position of the reference reflection, the measured electrical position can be used as a measure for the effective dielectric constant of the environment. Thus, it is possible to determine the effective dielectric constant with a spatial resolution given by the step size of the obstacle displacement. \n\n A conventional industrial TDR-system, operating in the baseband, is used for the signal generation and for the evaluation of the pulse delay time of the obstacle reflection. Thus, a cost effective method for the acquisition of the dielectric measurement data is available.",
				"issue": "A.1",
				"language": "English",
				"libraryCatalog": "Copernicus Online Journals",
				"pages": "1-4",
				"publicationTitle": "Advances in Radio Science",
				"url": "https://ars.copernicus.org/articles/6/1/2008/ars-6-1-2008.html",
				"volume": "6",
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
		"url": "https://acp.copernicus.org/articles/14/4349/2014/acp-14-4349-2014-metrics.html",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "TransCom N<sub>2</sub>O model inter-comparison – Part 1: Assessing the influence of transport and surface fluxes on tropospheric N<sub>2</sub>O variability",
				"creators": [
					{
						"firstName": "R. L.",
						"lastName": "Thompson",
						"creatorType": "author"
					},
					{
						"firstName": "P. K.",
						"lastName": "Patra",
						"creatorType": "author"
					},
					{
						"firstName": "K.",
						"lastName": "Ishijima",
						"creatorType": "author"
					},
					{
						"firstName": "E.",
						"lastName": "Saikawa",
						"creatorType": "author"
					},
					{
						"firstName": "M.",
						"lastName": "Corazza",
						"creatorType": "author"
					},
					{
						"firstName": "U.",
						"lastName": "Karstens",
						"creatorType": "author"
					},
					{
						"firstName": "C.",
						"lastName": "Wilson",
						"creatorType": "author"
					},
					{
						"firstName": "P.",
						"lastName": "Bergamaschi",
						"creatorType": "author"
					},
					{
						"firstName": "E.",
						"lastName": "Dlugokencky",
						"creatorType": "author"
					},
					{
						"firstName": "C.",
						"lastName": "Sweeney",
						"creatorType": "author"
					},
					{
						"firstName": "R. G.",
						"lastName": "Prinn",
						"creatorType": "author"
					},
					{
						"firstName": "R. F.",
						"lastName": "Weiss",
						"creatorType": "author"
					},
					{
						"firstName": "S.",
						"lastName": "O'Doherty",
						"creatorType": "author"
					},
					{
						"firstName": "P. J.",
						"lastName": "Fraser",
						"creatorType": "author"
					},
					{
						"firstName": "L. P.",
						"lastName": "Steele",
						"creatorType": "author"
					},
					{
						"firstName": "P. B.",
						"lastName": "Krummel",
						"creatorType": "author"
					},
					{
						"firstName": "M.",
						"lastName": "Saunois",
						"creatorType": "author"
					},
					{
						"firstName": "M.",
						"lastName": "Chipperfield",
						"creatorType": "author"
					},
					{
						"firstName": "P.",
						"lastName": "Bousquet",
						"creatorType": "author"
					}
				],
				"date": "2014-04-30",
				"DOI": "10.5194/acp-14-4349-2014",
				"ISSN": "1680-7316",
				"abstractNote": "We present a comparison of chemistry-transport models (TransCom-N2O) to examine the importance of atmospheric transport and surface fluxes on the variability of N2O mixing ratios in the troposphere. Six different models and two model variants participated in the inter-comparison and simulations were made for the period 2006 to 2009. In addition to N2O, simulations of CFC-12 and SF6 were made by a subset of four of the models to provide information on the models' proficiency in stratosphere–troposphere exchange (STE) and meridional transport, respectively. The same prior emissions were used by all models to restrict differences among models to transport and chemistry alone. Four different N2O flux scenarios totalling between 14 and 17 TgN yr−1 (for 2005) globally were also compared. The modelled N2O mixing ratios were assessed against observations from in situ stations, discrete air sampling networks and aircraft. All models adequately captured the large-scale patterns of N2O and the vertical gradient from the troposphere to the stratosphere and most models also adequately captured the N2O tropospheric growth rate. However, all models underestimated the inter-hemispheric N2O gradient by at least 0.33 parts per billion (ppb), equivalent to 1.5 TgN, which, even after accounting for an overestimate of emissions in the Southern Ocean of circa 1.0 TgN, points to a likely underestimate of the Northern Hemisphere source by up to 0.5 TgN and/or an overestimate of STE in the Northern Hemisphere. Comparison with aircraft data reveal that the models overestimate the amplitude of the N2O seasonal cycle at Hawaii (21° N, 158° W) below circa 6000 m, suggesting an overestimate of the importance of stratosphere to troposphere transport in the lower troposphere at this latitude. In the Northern Hemisphere, most of the models that provided CFC-12 simulations captured the phase of the CFC-12, seasonal cycle, indicating a reasonable representation of the timing of STE. However, for N2O all models simulated a too early minimum by 2 to 3 months owing to errors in the seasonal cycle in the prior soil emissions, which was not adequately represented by the terrestrial biosphere model. In the Southern Hemisphere, most models failed to capture the N2O and CFC-12 seasonality at Cape Grim, Tasmania, and all failed at the South Pole, whereas for SF6, all models could capture the seasonality at all sites, suggesting that there are large errors in modelled vertical transport in high southern latitudes.",
				"issue": "8",
				"language": "English",
				"libraryCatalog": "Copernicus Online Journals",
				"pages": "4349-4368",
				"publicationTitle": "Atmospheric Chemistry and Physics",
				"shortTitle": "TransCom N<sub>2</sub>O model inter-comparison – Part 1",
				"url": "https://acp.copernicus.org/articles/14/4349/2014/acp-14-4349-2014-metrics.html",
				"volume": "14",
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
		"url": "https://acp.copernicus.org/articles/special_issue15.html",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://acp.copernicus.org/recent_papers.html",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://nhess.copernicus.org/articles/13/299/2013/",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Technical Note: Use of remote sensing for landslide studies in Europe",
				"creators": [
					{
						"firstName": "V.",
						"lastName": "Tofani",
						"creatorType": "author"
					},
					{
						"firstName": "S.",
						"lastName": "Segoni",
						"creatorType": "author"
					},
					{
						"firstName": "A.",
						"lastName": "Agostini",
						"creatorType": "author"
					},
					{
						"firstName": "F.",
						"lastName": "Catani",
						"creatorType": "author"
					},
					{
						"firstName": "N.",
						"lastName": "Casagli",
						"creatorType": "author"
					}
				],
				"date": "2013-02-08",
				"DOI": "10.5194/nhess-13-299-2013",
				"ISSN": "1561-8633",
				"abstractNote": "Within the framework of FP7, an EU-funded SafeLand project, a questionnaire was prepared to collect information about the use of remote sensing for landslide study and to evaluate its actual application in landslide detection, mapping and monitoring. The questionnaire was designed using a Google form and was disseminated among end-users and researchers involved in landslide studies in Europe. In total, 49 answers from 17 different European countries were collected. The outcomes showed that landslide detection and mapping is mainly performed with aerial photos, often associated with optical and radar imagery. Concerning landslide monitoring, satellite radars prevail over the other types of data. Remote sensing is mainly used for detection/mapping and monitoring of slides, flows and lateral spreads with a preferably large scale of analysis (1:5000–1:25 000). All the compilers integrate remote sensing data with other thematic data, mainly geological maps, landslide inventory maps and DTMs and derived maps. According to the research and working experience of the compilers, remote sensing is generally considered to have a medium effectiveness/reliability for landslide studies. \n\n The results of the questionnaire can contribute to an overall sketch of the use of remote sensing in current landslide studies and show that remote sensing can be considered a powerful and well-established instrument for landslide mapping, monitoring and hazard analysis.",
				"issue": "2",
				"language": "English",
				"libraryCatalog": "Copernicus Online Journals",
				"pages": "299-309",
				"publicationTitle": "Natural Hazards and Earth System Sciences",
				"shortTitle": "Technical Note",
				"url": "https://nhess.copernicus.org/articles/13/299/2013/",
				"volume": "13",
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
		"url": "https://nhess.copernicus.org/articles/13/505/2013/",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "19 May 2011 Kütahya – Simav earthquake and evaluation of existing sample RC buildings according to the TEC-2007 criteria",
				"creators": [
					{
						"firstName": "M. H.",
						"lastName": "Arslan",
						"creatorType": "author"
					},
					{
						"firstName": "M.",
						"lastName": "Olgun",
						"creatorType": "author"
					},
					{
						"firstName": "M. A.",
						"lastName": "Köroğlu",
						"creatorType": "author"
					},
					{
						"firstName": "I. H.",
						"lastName": "Erkan",
						"creatorType": "author"
					},
					{
						"firstName": "A.",
						"lastName": "Köken",
						"creatorType": "author"
					},
					{
						"firstName": "O.",
						"lastName": "Tan",
						"creatorType": "author"
					}
				],
				"date": "2013-02-25",
				"DOI": "10.5194/nhess-13-505-2013",
				"ISSN": "1561-8633",
				"abstractNote": "This study examines the damage caused to reinforced concrete structures by the 2011 earthquake that occurred in Simav, Turkey. The study briefly reports on post-earthquake field observations, tectonic characteristics of the earthquake area, geotechnical characteristics of the field, and seismic characteristics of the earthquake. The main part of the study comprises a field study, material experiments, and performance analyses of two reinforced concrete buildings that survived the earthquake with medium level damage. The building performance was calculated and assessed according to the Turkish Earthquake Code requirements for existing building stock, and recommendations were made based on the findings.",
				"issue": "2",
				"language": "English",
				"libraryCatalog": "Copernicus Online Journals",
				"pages": "505-522",
				"publicationTitle": "Natural Hazards and Earth System Sciences",
				"url": "https://nhess.copernicus.org/articles/13/505/2013/",
				"volume": "13",
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
	}
]
/** END TEST CASES **/
