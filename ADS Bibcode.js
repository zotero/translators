{
	"translatorID": "09bd8037-a9bb-4f9a-b3b9-d18b2564b49e",
	"label": "ADS Bibcode",
	"creator": "Abe Jellinek",
	"target": "",
	"minVersion": "4.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 8,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-09-22 03:34:00"
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


// https://github.com/yymao/adstex/blob/64989c9e75d7401ea2b33b546664cbc34cce6a27/adstex.py
const bibcodeRe = /^\d{4}\D\S{13}[A-Z.:]$/;

function detectSearch(items) {
	return !!filterQuery(items).length;
}

function doSearch(items) {
	let bibcodes = filterQuery(items);
	if (!bibcodes.length) return;
	scrape(bibcodes);
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
	return /\/abs\/([^/]+)/.exec(url)[1];
}

function getTypeFromId(id) {
	// bibcodes always start with 4 digit year, then bibstem
	const bibstem = id.slice(4);
	if (bibstem.startsWith("MsT") || bibstem.startsWith("PhDT")) {
		return "thesis";
	}
	else if (bibstem.startsWith("arXiv")) {
		return "report"; // preprint
	}
	else {
		// now scan past the bibstem and find the volume number/type abbrev.
		const volume = bibstem.substring(5, 9);
		if (volume == "conf" || volume == "meet" || volume == "coll"
			|| volume == "proc" || volume == "book") {
			return "book";
		}
		else if (volume == "rept") {
			return "report";
		}
	}
	return "journalArticle";
}

function makePdfUrl(id) {
	return "https://ui.adsabs.harvard.edu/link_gateway/" + id + "/ARTICLE";
}

function scrape(ids) {
	ZU.doGet('https://api.adsabs.harvard.edu/v1/accounts/bootstrap', function (respText) {
		let json = JSON.parse(respText);
		let token = json.access_token;

		let exportUrl = "https://ui.adsabs.harvard.edu/v1/export/ris";
		let body = JSON.stringify({
			bibcode: ids,
			sort: ['date desc, bibcode desc']
		});

		ZU.doPost(exportUrl, body, function (respText) {
			let json = JSON.parse(respText);

			const translator = Zotero.loadTranslator("import");
			translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7"); // RIS
			translator.setString(json.export);
			translator.setHandler("itemDone", function (obj, item) {
				const id = extractId(item.url);
				let detectedType = getTypeFromId(id);
				if (detectedType != item.itemType) {
					Z.debug(`Changing item type: ${item.itemType} -> ${detectedType}`);
					item.itemType = detectedType;
				}

				item.extra = (item.extra || '') + `\nADS Bibcode: ${id}`;

				if (id.slice(4).startsWith('arXiv')) {
					item.extra += '\nType: article'; // will map to preprint
				}

				if (item.pages && item.pages.startsWith('arXiv:')) {
					// not sure why this ends up in the SP tag
					delete item.pages;
				}
				
				item.attachments.push({
					url: makePdfUrl(id),
					title: "Full Text PDF",
					mimeType: "application/pdf"
				});

				if (item.journalAbbreviation == item.publicationTitle) {
					item.journalAbbreviation = '';
				}

				if (item.date) {
					item.date = ZU.strToISO(item.date);
				}

				item.libraryCatalog = 'NASA ADS';

				item.complete();
			});
			translator.translate();
		}, { Authorization: 'Bearer:' + token });
	});
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
	}
]
/** END TEST CASES **/
