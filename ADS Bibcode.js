{
	"translatorID": "09bd8037-a9bb-4f9a-b3b9-d18b2564b49e",
	"label": "ADS Bibcode",
	"creator": "Abe Jellinek",
	"target": "",
	"minVersion": "6.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 8,
	"lastUpdated": "2025-04-29 03:02:00"
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

// Logic for accurate type detection. In general, the type in the RIS export is
// fairly accurate. However, it may misidentify a proceedings book as JOUR (but
// usually identifies conference papers fine). Theses are also identified as
// JOUR in the RIS file. Preprints are usually correctly identified.
function getRealType(bibStem, exportType) {
	if (/^(PhDT|MsT)/.test(bibStem)) {
		return "thesis";
	}

	// Fix misidentifying full proceedings book as JOUR
	let volume = bibStem.substring(5, 9);
	if (volume === "conf" && exportType === "journalArticle") {
		return "book";
	}

	return exportType;
}

// https://github.com/yymao/adstex/blob/64989c9e75d7401ea2b33b546664cbc34cce6a27/adstex.py
const bibcodeRe = /^\d{4}\D\S{13}[A-Z.:]$/;

function detectSearch(items) {
	return !!filterQuery(items).length;
}

async function doSearch(items) {
	let bibcodes = filterQuery(items);
	if (!bibcodes.length) return;
	await scrape(bibcodes);
}

function filterQuery(items) {
	if (!items) return [];

	if (!items.length) items = [items];

	// filter out invalid queries
	let bibcodes = [];
	for (let item of items) {
		if (item.adsBibcode && typeof item.adsBibcode == 'string') {
			let bibcode = item.adsBibcode.trim();
			if (bibcodeRe.test(bibcode)) {
				bibcodes.push(bibcode);
			}
		}
	}
	return bibcodes;
}

function extractId(url) {
	let m = url.match(/\/abs\/([^/]+)/);
	return m && decodeURIComponent(m[1]);
}

function makePdfUrl(id) {
	return "https://ui.adsabs.harvard.edu/link_gateway/" + id + "/ARTICLE";
}

// Detect if an item is from arXiv. This is necessary because bibcodes of older
// arXiv preprints don't start with "arXiv"
function isArXiv(item, bibStem) {
	if (item.DOI && item.DOI.startsWith("10.48550/")) return true;
	if (bibStem.startsWith("arXiv")) return true;
	return false;
}

async function scrape(ids) {
	let bootstrap = await requestJSON("https://api.adsabs.harvard.edu/v1/accounts/bootstrap");
	if (!bootstrap || !bootstrap.access_token) {
		throw new Error("ADS Bibcode: cannot obtain access token");
	}
	let body = JSON.stringify({ bibcode: ids, sort: ['no sort'] });
	let response = await requestJSON("https://api.adsabs.harvard.edu/v1/export/ris", {
		method: "POST",
		body,
		headers: {
			Accept: "application/json",
			Authorization: `Bearer ${bootstrap.access_token}`,
			"Content-Type": "application/json",
		},
	});

	let translator = Zotero.loadTranslator("import");
	translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7"); // RIS
	translator.setString(response.export);
	translator.setHandler("itemDone", function (obj, item) {
		let id = extractId(item.url);
		let bibStem = id.slice(4);

		let type = getRealType(bibStem, item.itemType);
		if (type !== item.itemType) {
			Z.debug(`ADS Bibcode: changing item type: ${item.itemType} -> ${type}`);
			item.itemType = type;
		}

		if (isArXiv(item, bibStem)) {
			item.itemType = "preprint";
			item.publisher = "arXiv";
			delete item.pages;
			delete item.publicationTitle;
			delete item.journalAbbreviation;
		}

		item.extra = (item.extra || '') + `\nADS Bibcode: ${id}`;

		// for thesis-type terminology, see
		// https://adsabs.harvard.edu/abs_doc/journals1.html
		if (item.itemType === "thesis") {
			if (bibStem.startsWith("PhDT")) {
				item.thesisType = "Ph.D. thesis";
			}
			else if (bibStem.startsWith("MsT")) {
				item.thesisType = "Masters thesis";
			}
			delete item.journalAbbreviation; // from spurious JO tag
			delete item.publicationTitle;
		}

		item.attachments.push({
			url: makePdfUrl(id),
			title: "Full Text PDF",
			mimeType: "application/pdf"
		});

		if (item.journalAbbreviation == item.publicationTitle) {
			delete item.journalAbbreviation;
		}

		if (item.date) {
			item.date = ZU.strToISO(item.date);
		}

		item.libraryCatalog = 'NASA ADS';

		item.complete();
	});
	await translator.translate();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "search",
		"input": {
			"adsBibcode": "2022MSSP..16208070W"
		},
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Research and application of neural network for tread wear prediction and optimization",
				"creators": [
					{
						"lastName": "Wang",
						"firstName": "Meiqi",
						"creatorType": "author"
					},
					{
						"lastName": "Jia",
						"firstName": "Sixian",
						"creatorType": "author"
					},
					{
						"lastName": "Chen",
						"firstName": "Enli",
						"creatorType": "author"
					},
					{
						"lastName": "Yang",
						"firstName": "Shaopu",
						"creatorType": "author"
					},
					{
						"lastName": "Liu",
						"firstName": "Pengfei",
						"creatorType": "author"
					},
					{
						"lastName": "Qi",
						"firstName": "Zhuang",
						"creatorType": "author"
					}
				],
				"date": "2022-01-01",
				"DOI": "10.1016/j.ymssp.2021.108070",
				"ISSN": "0888-3270",
				"abstractNote": "The wheel tread wear of heavy haul freight car in operation leads to shortened wheel turning period, reduced operation life, and poor train operation performance. In addition, wheel rail wear is a complex non-linear problem that integrates multiple disciplines. Thus, using a single physical or mathematical model to accurately describe and predict it is difficult. How to establish a model that could accurately predict wheel tread wear is an urgent problem and challenge that needs to be solved. In this paper, a tread wear prediction and optimization method based on chaotic quantum particle swarm optimization (CQPSO)-optimized derived extreme learning machine (DELM), namely CQPSO-DELM, is proposed to overcome this problem. First, an extreme learning machine model with derivative characteristics is proposed (DELM). Next, the chaos algorithm is introduced into the quantum particle swarm optimization algorithm to optimize the parameters of DELM. Then, through the CQPSO-DELM prediction model, the vehicle dynamics model simulates the maximum wheel tread wear under different test parameters to train and predict. Results show that the error performance index of the CQPSO-DELM prediction model is smaller than that of other algorithms. Thus, it could better reflect the influence of different parameters on the value of wheel tread wear. CQPSO is used to optimize the tread coordinates to obtain a wheel profile with low wear. The optimized wheel profile is fitted and reconstructed by the cubic non-uniform rational B-spline (NURBS) theory, and the optimized wear value of the tread is compared with the original wear value. The optimized wear value is less than the original wear value, thus verifying the effectiveness of the optimization model. The CQPSO-DELM model proposed in this paper could predict the wear value of different working conditions and tree shapes and solve the problem that different operating conditions and complex environment could have a considerable effect on the prediction of tread wear value. The optimization of wheel tread and the wear prediction of different tread shapes are realized from the angle of artificial intelligence for the first time.",
				"extra": "ADS Bibcode: 2022MSSP..16208070W",
				"libraryCatalog": "NASA ADS",
				"pages": "108070",
				"publicationTitle": "Mechanical Systems and Signal Processing",
				"url": "https://ui.adsabs.harvard.edu/abs/2022MSSP..16208070W",
				"volume": "162",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "00-01"
					},
					{
						"tag": "99-00"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "search",
		"input": {
			"adsBibcode": "2021PhDT.........5C"
		},
		"items": [
			{
				"itemType": "thesis",
				"title": "Searching for the Astrophysical Gravitational-Wave Background and Prompt Radio Emission from Compact Binaries",
				"creators": [
					{
						"lastName": "Callister",
						"firstName": "Thomas A.",
						"creatorType": "author"
					}
				],
				"date": "2021-06-01",
				"abstractNote": "Gravitational-wave astronomy is now a reality. During my time at Caltech, the Advanced LIGO and Virgo observatories have detected gravitational waves from dozens of compact binary coalescences. All of these gravitational-wave events occurred in the relatively local Universe. In the first part of this thesis, I will instead look towards the remote Universe, investigating what LIGO and Virgo may be able to learn about cosmologically-distant compact binaries via observation of the stochastic gravitational-wave background. The stochastic gravitational-wave background is composed of the incoherent superposition of all distant, individually-unresolvable gravitational-wave sources. I explore what we learn from study of the gravitational-wave background, both about the astrophysics of compact binaries and the fundamental nature of gravitational waves. Of course, before we can study the gravitational-wave background we must first detect it. I therefore present searches for the gravitational-wave background using data from Advanced LIGO's first two observing runs, obtaining the most stringent upper limits to date on strength of the stochastic background. Finally, I consider how one might validate an apparent detection of the gravitational-wave background, confidently distinguishing a true astrophysical signal from spurious terrestrial artifacts. The second part of this thesis concerns the search for electromagnetic counterparts to gravitational-wave events. The binary neutron star merger GW170817 was accompanied by a rich set of electromagnetic counterparts spanning nearly the entire electromagnetic spectrum. Beyond these counterparts, compact binaries may additionally generate powerful radio transients at or near their time of merger. First, I consider whether there is a plausible connection between this so-called \"prompt radio emission\" and fast radio bursts — enigmatic radio transients of unknown origin. Next, I present the first direct search for prompt radio emission from a compact binary merger using the Owens Valley Radio Observatory Long Wavelength Array (OVRO-LWA). While no plausible candidates are identified, this effort successfully demonstrates the prompt radio follow-up of a gravitational-wave source, providing a blueprint for LIGO and Virgo follow-up in their O3 observing run and beyond.",
				"extra": "ADS Bibcode: 2021PhDT.........5C",
				"libraryCatalog": "NASA ADS",
				"thesisType": "Ph.D. thesis",
				"url": "https://ui.adsabs.harvard.edu/abs/2021PhDT.........5C",
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
		"type": "search",
		"input": {
			"adsBibcode": "2021wfc..rept....8D"
		},
		"items": [
			{
				"itemType": "report",
				"title": "WFC3 IR Blob Classification with Machine Learning",
				"creators": [
					{
						"lastName": "Dauphin",
						"firstName": "F.",
						"creatorType": "author"
					},
					{
						"lastName": "Medina",
						"firstName": "J. V.",
						"creatorType": "author"
					},
					{
						"lastName": "McCullough",
						"firstName": "P. R.",
						"creatorType": "author"
					}
				],
				"date": "2021-06-01",
				"abstractNote": "IR blobs are small, circular, dark artifacts in WFC3 IR images caused by particulates that occasionally are deposited on a flat mirror that is nearly optically conjugate to the IR detector. Machine learning can potentially reduce the effort currently devoted to visually inspecting blobs. We describe how machine learning (ML) techniques have been implemented to develop software that will automatically find new IR blobs and notify the WFC3 Quicklook team. This report describes the data preparation, development of the ML model, and criteria for success. The results of our latest test cases demonstrate that the model finds blobs reliably, with the model correctly classifying blob and non-blob images 94% and 88% of the time, respectively. We also report tips and lessons learned from our experience in machine learning as a result of this project.",
				"extra": "ADS Bibcode: 2021wfc..rept....8D",
				"libraryCatalog": "NASA ADS",
				"pages": "8",
				"url": "https://ui.adsabs.harvard.edu/abs/2021wfc..rept....8D",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Blobs"
					},
					{
						"tag": "Convolutional Neural Networks"
					},
					{
						"tag": "HST"
					},
					{
						"tag": "Hubble Space Telescope"
					},
					{
						"tag": "IR"
					},
					{
						"tag": "Machine Learning"
					},
					{
						"tag": "STScI"
					},
					{
						"tag": "Space Telescope Science Institute"
					},
					{
						"tag": "WFC3"
					},
					{
						"tag": "Wide Field Camera 3"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "search",
		"input": {
			"adsBibcode": "2021sti..book.....P"
		},
		"items": [
			{
				"itemType": "book",
				"title": "Stochastic Thermodynamics: An Introduction",
				"creators": [
					{
						"lastName": "Peliti",
						"firstName": "Luca",
						"creatorType": "author"
					},
					{
						"lastName": "Pigolotti",
						"firstName": "Simone",
						"creatorType": "author"
					}
				],
				"date": "2021-07-01",
				"abstractNote": "The first comprehensive graduate-level introduction to stochastic thermodynamics. Stochastic thermodynamics is a well-defined subfield of statistical physics that aims to interpret thermodynamic concepts for systems ranging in size from a few to hundreds of nanometers, the behavior of which is inherently random due to thermal fluctuations. This growing field therefore describes the nonequilibrium dynamics of small systems, such as artificial nanodevices and biological molecular machines, which are of increasing scientific and technological relevance. This textbook provides an up-to-date pedagogical introduction to stochastic thermodynamics, guiding readers from basic concepts in statistical physics, probability theory, and thermodynamics to the most recent developments in the field. Gradually building up to more advanced material, the authors consistently prioritize simplicity and clarity over exhaustiveness and focus on the development of readers' physical insight over mathematical formalism. This approach allows the reader to grow as the book proceeds, helping interested young scientists to enter the field with less effort and to contribute to its ongoing vibrant development. Chapters provide exercises to complement and reinforce learning. Appropriate for graduate students in physics and biophysics, as well as researchers, Stochastic Thermodynamics serves as an excellent initiation to this rapidly evolving field. Emphasizes a pedagogical approach to the subject Highlights connections with the thermodynamics of information Pays special attention to molecular biophysics applications Privileges physical intuition over mathematical formalism Solutions manual available on request for instructors adopting the book in a course",
				"extra": "ADS Bibcode: 2021sti..book.....P",
				"libraryCatalog": "NASA ADS",
				"shortTitle": "Stochastic Thermodynamics",
				"url": "https://ui.adsabs.harvard.edu/abs/2021sti..book.....P",
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
		"type": "search",
		"input": {
			"adsBibcode": "2020jsrs.conf.....B"
		},
		"items": [
			{
				"itemType": "book",
				"title": "Proceedings of the Journées Systèmes de Référence Spatio-temporels 2019 \"Astrometry, Earth Rotation and Reference System in the Gaia era\"",
				"creators": [
					{
						"lastName": "Bizouard",
						"firstName": "Christian",
						"creatorType": "author"
					}
				],
				"date": "2020-09-01",
				"extra": "ADS Bibcode: 2020jsrs.conf.....B",
				"libraryCatalog": "NASA ADS",
				"url": "https://ui.adsabs.harvard.edu/abs/2020jsrs.conf.....B",
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
		"type": "search",
		"input": {
			"adsBibcode": "2020jsrs.conf..209S"
		},
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "Atmospheric angular momentum related to Earth rotation studies: history and modern developments",
				"creators": [
					{
						"lastName": "Salstein",
						"firstName": "D.",
						"creatorType": "author"
					}
				],
				"date": "2020-09-01",
				"abstractNote": "It was noted some time ago that the angular momentum of the atmosphere varies, both regionally as well as in total. Given the conservation of angular momentum in the Earth system, except for known external torques, such variability implies transfer of the angular momentum across the atmosphere's lower boundary. As nearly all is absorbed by the Earth below, the solid Earth changes its overall rotation from this impact. Due to the large difference between in the moments of inertia of the atmosphere and Earth, relatively big differences in the atmosphere are translated as relatively very small differences in the Earth, measurable as changes in Earth rotation rate, and polar motion. The atmospheric angular momentum (AAM) is that due to the motion of the winds and to the changes in mass distribution, closely related to the atmosphere pressure patterns; its variability in the atmosphere is mirrored in the Earth rotation rate and polar motion. This connection between the global solid Earth properties and the global and regional atmosphere on a number of time scales, especially seasonal and interannual, was much appreciated by Barbara Kolaczek, with Jolanta Nastula, at the Space Research Center in Warsaw, and this was a subject of our collaborative studies. Many calculations were made of atmospheric angular momentum, leading to a service under the Global Geophysical Fluids Center of the IERS based on calculations using both operational meteorological series, determined for weather forecasting purposes, and retrospective analyses of the atmosphere. Theoretical development of the connection between the AAM, Earth rotation/polar motion, and also the angular momentum of the other geophysical fluids occurred at the same time that space-based observations and enhanced computer power were allowing improved skills for both weather analysis and forecasting. Hence better determination of the AAM became possible, which could be used as a measure for forecasting Earth rotation. Today we are looking at the atmosphere in combination with the ocean and other fluids, and also assessing the implications of climate variability on Earth rotation through climate model research. According to models of the Earth system, significant changes in winds appear to be a possible result of climate change, with implications for the Earth rotation parameters.",
				"conferenceName": "Astrometry, Earth Rotation, and Reference Systems in the GAIA era",
				"extra": "ADS Bibcode: 2020jsrs.conf..209S",
				"libraryCatalog": "NASA ADS",
				"pages": "209-213",
				"shortTitle": "Atmospheric angular momentum related to Earth rotation studies",
				"url": "https://ui.adsabs.harvard.edu/abs/2020jsrs.conf..209S",
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
		"type": "search",
		"input": [
			{
				"adsBibcode": "2002math.....11159P"
			},
			{
				"adsBibcode": "2003math......3109P"
			}
		],
		"items": [
			{
				"itemType": "preprint",
				"title": "The entropy formula for the Ricci flow and its geometric applications",
				"creators": [
					{
						"lastName": "Perelman",
						"firstName": "Grisha",
						"creatorType": "author"
					}
				],
				"date": "2002-11-01",
				"DOI": "10.48550/arXiv.math/0211159",
				"abstractNote": "We present a monotonic expression for the Ricci flow, valid in all dimensions and without curvature assumptions. It is interpreted as an entropy for a certain canonical ensemble. Several geometric applications are given. In particular, (1) Ricci flow, considered on the space of riemannian metrics modulo diffeomorphism and scaling, has no nontrivial periodic orbits (that is, other than fixed points); (2) In a region, where singularity is forming in finite time, the injectivity radius is controlled by the curvature; (3) Ricci flow can not quickly turn an almost euclidean region into a very curved one, no matter what happens far away. We also verify several assertions related to Richard Hamilton's program for the proof of Thurston geometrization conjecture for closed three-manifolds, and give a sketch of an eclectic proof of this conjecture, making use of earlier results on collapsing with local lower curvature bound.",
				"extra": "ADS Bibcode: 2002math.....11159P",
				"libraryCatalog": "NASA ADS",
				"repository": "arXiv",
				"url": "https://ui.adsabs.harvard.edu/abs/2002math.....11159P",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "53C"
					},
					{
						"tag": "Differential Geometry"
					}
				],
				"notes": [],
				"seeAlso": []
			},
			{
				"itemType": "preprint",
				"title": "Ricci flow with surgery on three-manifolds",
				"creators": [
					{
						"lastName": "Perelman",
						"firstName": "Grisha",
						"creatorType": "author"
					}
				],
				"date": "2003-03-01",
				"DOI": "10.48550/arXiv.math/0303109",
				"abstractNote": "This is a technical paper, which is a continuation of math.DG/0211159. Here we construct Ricci flow with surgeries and verify most of the assertions, made in section 13 of that e-print; the exceptions are (1) the statement that manifolds that can collapse with local lower bound on sectional curvature are graph manifolds - this is deferred to a separate paper, since the proof has nothing to do with the Ricci flow, and (2) the claim on the lower bound for the volume of maximal horns and the smoothness of solutions from some time on, which turned out to be unjustified and, on the other hand, irrelevant for the other conclusions.",
				"extra": "ADS Bibcode: 2003math......3109P",
				"libraryCatalog": "NASA ADS",
				"repository": "arXiv",
				"url": "https://ui.adsabs.harvard.edu/abs/2003math......3109P",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "53C"
					},
					{
						"tag": "Differential Geometry"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "search",
		"input": {
			"adsBibcode": "1995LNP...463...51E"
		},
		"items": [
			{
				"itemType": "bookSection",
				"title": "Observations and Cosmological Models",
				"creators": [
					{
						"lastName": "Ellis",
						"firstName": "G. F. R.",
						"creatorType": "author"
					}
				],
				"date": "1995-01-01",
				"bookTitle": "Galaxies in the Young Universe",
				"extra": "DOI: 10.1007/BFb0102359\nADS Bibcode: 1995LNP...463...51E",
				"libraryCatalog": "NASA ADS",
				"pages": "51",
				"url": "https://ui.adsabs.harvard.edu/abs/1995LNP...463...51E",
				"volume": "463",
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
		"type": "search",
		"input": {
			"adsBibcode": "1997MsT...........B"
		},
		"items": [
			{
				"itemType": "thesis",
				"title": "Comparative Analysis of Selected Radiation Effects in Medium Earth Orbits",
				"creators": [
					{
						"lastName": "Bolin",
						"firstName": "Jennifer A.",
						"creatorType": "author"
					}
				],
				"date": "1997-12-01",
				"abstractNote": "Satellite design is well developed for the common Low Earth Orbit (LEO) and Geosynchronous Orbit (GEO) and Highly Elliptical Orbits (HEO), i.e., Molniya, cases; Medium Earth Orbit (MEO) satellite design is a relatively new venture. MEO is roughly defined as being altitudes above LEO and below GEO. A primary concern, and a major reason for the delay in exploiting the MEO altitudes, has been the expected radiation environment and corresponding satellite degradation anticipated to occur at MEO altitudes. The presence of the Van Allen belts, a major source of radiation, along with the suitability of GEO and LEO orbits, has conventionally discouraged satellite placement in MEO. As conventional Earth orbits become increasingly crowded, MEO will become further populated. This thesis investigates the major sources of radiation (geomagnetically trapped particles, solar particle events and galactic cosmic radiation) with respect to specific Naval Research Laboratory (NRL) designated MEO (altitudes between 3,000 nautical miles (nmi) and 9,000 nmi; (inclination angle of 15 degrees). The contribution of each of these components to the total radiation experienced in MEO and the effects of the expected radiation on a representative spacecraft are analyzed in comparison to a baseline LEO orbit of 400 nmi and 70 degrees inclination. Dose depth curves are calculated for several configurations, and show that weight gains from necessary expected shielding are not extreme. The radiation effects considered include proton displacement dose and solar cell degradation.",
				"extra": "ADS Bibcode: 1997MsT...........B",
				"libraryCatalog": "NASA ADS",
				"thesisType": "Masters thesis",
				"url": "https://ui.adsabs.harvard.edu/abs/1997MsT...........B",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Aerospace Environments"
					},
					{
						"tag": "Astrophysics"
					},
					{
						"tag": "Cosmic Rays"
					},
					{
						"tag": "Degradation"
					},
					{
						"tag": "Elliptical Orbits"
					},
					{
						"tag": "Galactic Radiation"
					},
					{
						"tag": "Geosynchronous Orbits"
					},
					{
						"tag": "Low Earth Orbits"
					},
					{
						"tag": "Radiation Belts"
					},
					{
						"tag": "Radiation Effects"
					},
					{
						"tag": "Satellite Design"
					},
					{
						"tag": "Solar Activity"
					},
					{
						"tag": "Solar Cells"
					},
					{
						"tag": "Solar Corpuscular Radiation"
					},
					{
						"tag": "Solar Storms"
					},
					{
						"tag": "Unmanned Spacecraft"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
