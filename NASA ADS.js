{
	"translatorID": "7987b420-e8cb-4bea-8ef7-61c2377cd686",
	"label": "NASA ADS",
	"creator": "Tim Hostetler, Abe Jellinek, and Zoë C. Ma",
	"target": "^https://ui\\.adsabs\\.harvard\\.edu/(search|abs)/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-06-09 17:06:21"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2019-2021 Tim Hostetler and Abe Jellinek

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

const preprintType = ZU.fieldIsValidForType('title', 'preprint')
	? 'preprint'
	: 'report';

function getSearchResults(doc) {
	const results = doc.querySelectorAll("a[href$=abstract]");
	const entries = {};
	for (let el of results) {
		const titleEl = el.querySelector(":scope h3");
		if (!titleEl) {
			continue;
		}
		const hrefParts = el.getAttribute("href").split("/");
		if (hrefParts.length > 2) {
			const identifier = hrefParts[hrefParts.length - 2];
			entries[identifier] = ZU.trimInternal(titleEl.textContent);
		}
	}
	return entries;
}

function extractId(url) {
	return decodeURIComponent(/\/abs\/([^/]+)/.exec(url)[1]);
}

function getTypeFromId(id) {
	// bibcodes always start with 4 digit year, then bibstem
	const bibstem = id.slice(4);
	if (bibstem.startsWith("MsT") || bibstem.startsWith("PhDT")) {
		return "thesis";
	}
	else if (bibstem.startsWith("arXiv")) {
		return preprintType;
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

function detectWeb(doc, url) {
	if (url.includes("/search/")) {
		return "multiple";
	}
	else if (url.includes("/abs/")) {
		return getTypeFromId(extractId(url));
	}
	return false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) === "multiple") {
		Zotero.selectItems(getSearchResults(doc), function (items) {
			if (!items) return true;
			return scrape(Object.keys(items));
		});
	}
	else {
		scrape([extractId(url)]);
	}
}

function scrape(ids) {
	let trans = Zotero.loadTranslator('search');
	trans.setTranslator('09bd8037-a9bb-4f9a-b3b9-d18b2564b49e');
	trans.setSearch(ids.map(id => ({ adsBibcode: id })));
	trans.translate();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://ui.adsabs.harvard.edu/search/p_=0&q=star&sort=date%20desc%2C%20bibcode%20desc",
		"defer": true,
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://ui.adsabs.harvard.edu/abs/2020CNSNS..8205014M/abstract",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Modeling excitability in cerebellar stellate cells: Temporal changes in threshold, latency and frequency of firing",
				"creators": [
					{
						"lastName": "Mitry",
						"firstName": "John",
						"creatorType": "author"
					},
					{
						"lastName": "Alexander",
						"firstName": "Ryan P. D.",
						"creatorType": "author"
					},
					{
						"lastName": "Farjami",
						"firstName": "Saeed",
						"creatorType": "author"
					},
					{
						"lastName": "Bowie",
						"firstName": "Derek",
						"creatorType": "author"
					},
					{
						"lastName": "Khadra",
						"firstName": "Anmar",
						"creatorType": "author"
					}
				],
				"date": "2020-03-01",
				"DOI": "10.1016/j.cnsns.2019.105014",
				"ISSN": "1007-5704",
				"abstractNote": "Cerebellar stellate cells are inhibitory molecular interneurons that regulate the firing properties of Purkinje cells, the sole output of cerebellar cortex. Recent evidence suggests that these cells exhibit temporal increase in excitability during whole-cell patch-clamp configuration in a phenomenon termed runup. They also exhibit a non-monotonic first-spike latency profile as a function of the holding potential in response to a fixed step-current. In this study, we use modeling approaches to unravel the dynamics of runup and categorize the firing behavior of cerebellar stellate cells as either type I or type II oscillators. We then extend this analysis to investigate how the non-monotonic latency profile manifests itself during runup. We employ a previously developed, but revised, Hodgkin-Huxley type model to show that stellate cells are indeed type I oscillators possessing a saddle node on an invariant cycle (SNIC) bifurcation. The SNIC in the model acts as a \"threshold\" for tonic firing and produces a slow region in the phase space called the ghost of the SNIC. The model reveals that (i) the SNIC gets left-shifted during runup with respect to Iapp =Itest in the current-step protocol, and (ii) both the distance from the stable limit cycle along with the slow region produce the non-monotonic latency profile as a function of holding potential. Using the model, we elucidate how latency can be made arbitrarily large for a specific range of holding potentials close to the SNIC during pre-runup (post-runup). We also demonstrate that the model can produce transient single spikes in response to step-currents entirely below ISNIC, and that a pair of dynamic inhibitory and excitatory post-synaptic inputs can robustly evoke action potentials, provided that the magnitude of the inhibition is either low or high but not intermediate. Our results show that the topology of the SNIC is the key to explaining such behaviors.",
				"extra": "ADS Bibcode: 2020CNSNS..8205014M",
				"libraryCatalog": "NASA ADS",
				"pages": "105014",
				"publicationTitle": "Communications in Nonlinear Science and Numerical Simulations",
				"shortTitle": "Modeling excitability in cerebellar stellate cells",
				"url": "https://ui.adsabs.harvard.edu/abs/2020CNSNS..8205014M",
				"volume": "82",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Non-monotonic first-spike latency"
					},
					{
						"tag": "Runup"
					},
					{
						"tag": "Transient single spiking"
					},
					{
						"tag": "Type I oscillator with a SNIC"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://ui.adsabs.harvard.edu/abs/2019MsT.........15M/abstract",
		"items": [
			{
				"itemType": "thesis",
				"title": "Autonomous quantum Maxwell's demon using superconducting devices",
				"creators": [
					{
						"lastName": "Martins",
						"firstName": "Gabriela Fernandes",
						"creatorType": "author"
					}
				],
				"date": "2019-07-01",
				"abstractNote": "During the last years, with the evolution of technology enabling the control of nano-mesoscopic systems, the possibility of experimentally implementing a Maxwell's demon has aroused much interest. Its classical version has already been implemented, in photonic and electronic systems, and currently its quantum version is being broadly studied. In this context, the purpose of this work is the development of a protocol for the implementation of the quantum version of an autonomous Maxwell's demon in a system of superconducting qubits. The system is composed of an Asymmetrical Single-Cooper-Pair Transistor, ASCPT, which has its extremities in contact with heat baths, such that the left one has a lower temperature than the right one. And of a device of two interacting Cooper-Pair Boxes, CPB's, named as an ECPB, for Extended Cooper-Pair Box. The ECPB is also in contact with a heat bath and possess a genuine quantum feature, entanglement, being described by its antisymmetric and symmetric states, that couple capacitively to the ASCPT with different strengths. A specific operating regime was found where the spontaneous dynamics of the tunneling of Cooper pairs through the ASCPT, will led to a heat transport from the bath in contact with the left extremity of the ASCPT to the bath at the right. And so, as in Maxwell's original thought experiment, the demon, which is composed by the ECPB and the island of the ASCPT, mediates a heat flux from a cold to a hot bath, without the expense of work. However as expected, the violation of the 2nd law of thermodynamics does not occur, as during the dynamics heat is also released to the bath in contact with the ECPB, compensating the decrease of entropy that occurs in the baths in contact with the ASCPT.",
				"extra": "ADS Bibcode: 2019MsT.........15M",
				"libraryCatalog": "NASA ADS",
				"url": "https://ui.adsabs.harvard.edu/abs/2019MsT.........15M",
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
		"url": "https://ui.adsabs.harvard.edu/abs/2019PhDT........69B/abstract",
		"items": [
			{
				"itemType": "thesis",
				"title": "Cosmology on the Edge of Lambda-Cold Dark Matter",
				"creators": [
					{
						"lastName": "Bernal",
						"firstName": "Jose Luis",
						"creatorType": "author"
					}
				],
				"date": "2019-09-01",
				"abstractNote": "Cosmology is the science that studies the Universe as whole, aiming to understand its origin, composition and evolution. During the last decades, cosmology has transitioned from a \"data staved\" to a \"data driven\" science, inaugurating what is known as precision cosmology. This huge observational effort has confirmed and fostered theoretical research, and established the standard model of cosmology: Lambda-Cold Dark Matter (LCDM). This model successfully reproduces most of the observations. However, there are some persistent tensions between experiments that might be smoking guns of new physics beyond this model. Anyways, there is a difference between modeling and understanding, and LCDM is a phenomenological model that, for instance, does not describe the nature of the dark matter or dark energy. This thesis collects part of my research focused on pushing the limits of the standard cosmological model and its assumptions, regarding also existing tensions between experiments. New strategies to optimize the performance of future experiments are also proposed and discussed. The largest existing tension is between the direct measurements of the Hubble constant using the distance ladder in the local Universe and the inferred value obtained from observations of the Cosmic Microwave Background when LCDM is assumed. A model independent reconstruction of the late-time expansion history of the Universe is carried out, which allows us to identify possible sources and solutions of the tension. We also introduce the concept of the low redshift standard ruler, and measure it in a model independent way. Finally, we introduce a statistical methodology to analyze several data sets in a conservative way, no matter the level of discrepancy between them, accounting for the potential presence of systematic errors. The role of primordial black holes as candidates for dark matter is addressed in this thesis, too. Concretely, the impact of an abundant population of primordial black holes in the rest of cosmological parameters is discussed, considering also populations with extended mass distributions. In addition, massive primordial black holes might be the seeds that are needed to explain the origin of the supermassive black holes located in the center of the galaxies. We predict the contribution of a population of massive primordial black holes to the 21 cm radiation from the dark ages. This way, observations of the 21 cm intensity mapping observations of the dark ages could be used to ascertain if the seeds of the supermassive black holes are primordial. Finally, we estimate the potential of radio-continuum galaxy surveys to constrain LCDM. These kind of experiments can survey the sky quicker than spectroscopic and optical photometric surveys and cover much larger volumes. Therefore, they will be specially powerful to constrain physics which has impact on the largest observable scales, such as primordial non Gaussianity. On the other hand, intensity mapping experiments can reach higher redshifts than galaxy surveys, but the cosmological information of this signal is coupled with astrophysics. We propose a methodology to disentangle astrophysics and optimally extract cosmological information from the intensity mapping spectrum. Thanks to this methodology, intensity mapping will constrain the expansion history of the Universe up to reionization, as shown in this thesis.",
				"extra": "ADS Bibcode: 2019PhDT........69B",
				"libraryCatalog": "NASA ADS",
				"url": "https://ui.adsabs.harvard.edu/abs/2019PhDT........69B",
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
		"url": "https://ui.adsabs.harvard.edu/abs/2022MSSP..16208010Y/abstract",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Bio-inspired toe-like structure for low-frequency vibration isolation",
				"creators": [
					{
						"lastName": "Yan",
						"firstName": "Ge",
						"creatorType": "author"
					},
					{
						"lastName": "Zou",
						"firstName": "Hong-Xiang",
						"creatorType": "author"
					},
					{
						"lastName": "Wang",
						"firstName": "Sen",
						"creatorType": "author"
					},
					{
						"lastName": "Zhao",
						"firstName": "Lin-Chuan",
						"creatorType": "author"
					},
					{
						"lastName": "Wu",
						"firstName": "Zhi-Yuan",
						"creatorType": "author"
					},
					{
						"lastName": "Zhang",
						"firstName": "Wen-Ming",
						"creatorType": "author"
					}
				],
				"date": "2022-01-01",
				"DOI": "10.1016/j.ymssp.2021.108010",
				"ISSN": "0888-3270",
				"abstractNote": "Inspired by the cushioning effect of the felid paws in contact with the ground, a novel bio-inspired toe-like structure (TLS) is developed and systematically studied for low-frequency vibration isolation. The TLS consists of two rods with different length (as phalanxes) and a linear spring (as muscle). Based on Hamiltonian principle, the dynamic model is established considering spring deformation and joint rotation damping. The derived equivalent stiffness reveals that the proposed TLS possesses favorable high static and low dynamic stiffness (HSLDS) characteristics in a wide displacement range. Besides, displacement transmissibility suggests that the proposed TLS isolator has low resonance frequency and can effectively isolate base excitation at low frequencies. Comprehensive parameter analysis shows that the inherent nonlinearities in stiffness and damping is conductive to vibration isolation and can be designed/adjusted on demand by selecting suitable structural parameters. This flexibility gives TLS advantages and great potential in extensive engineering applications when subjected to variable vibration loads. A prototype is fabricated and tested for a comprehensive recognize of its advantageous vibration isolation performance in low frequency band. The vibration with excitation frequency higher than 3 Hz can be effectively isolated. This novel bio-inspired TLS provides a feasible approach to passive vibration control and isolation in low frequency band.",
				"extra": "ADS Bibcode: 2022MSSP..16208010Y",
				"libraryCatalog": "NASA ADS",
				"pages": "108010",
				"publicationTitle": "Mechanical Systems and Signal Processing",
				"url": "https://ui.adsabs.harvard.edu/abs/2022MSSP..16208010Y",
				"volume": "162",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Bio-inspired structure"
					},
					{
						"tag": "Low-frequency vibration"
					},
					{
						"tag": "Nonlinear dynamics"
					},
					{
						"tag": "Vibration isolation"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://ui.adsabs.harvard.edu/abs/2020arXiv201207436Z/abstract",
		"items": [
			{
				"itemType": "preprint",
				"title": "Informer: Beyond Efficient Transformer for Long Sequence Time-Series Forecasting",
				"creators": [
					{
						"lastName": "Zhou",
						"firstName": "Haoyi",
						"creatorType": "author"
					},
					{
						"lastName": "Zhang",
						"firstName": "Shanghang",
						"creatorType": "author"
					},
					{
						"lastName": "Peng",
						"firstName": "Jieqi",
						"creatorType": "author"
					},
					{
						"lastName": "Zhang",
						"firstName": "Shuai",
						"creatorType": "author"
					},
					{
						"lastName": "Li",
						"firstName": "Jianxin",
						"creatorType": "author"
					},
					{
						"lastName": "Xiong",
						"firstName": "Hui",
						"creatorType": "author"
					},
					{
						"lastName": "Zhang",
						"firstName": "Wancai",
						"creatorType": "author"
					}
				],
				"date": "2020-12-01",
				"DOI": "10.48550/arXiv.2012.07436",
				"abstractNote": "Many real-world applications require the prediction of long sequence time-series, such as electricity consumption planning. Long sequence time-series forecasting (LSTF) demands a high prediction capacity of the model, which is the ability to capture precise long-range dependency coupling between output and input efficiently. Recent studies have shown the potential of Transformer to increase the prediction capacity. However, there are several severe issues with Transformer that prevent it from being directly applicable to LSTF, including quadratic time complexity, high memory usage, and inherent limitation of the encoder-decoder architecture. To address these issues, we design an efficient transformer-based model for LSTF, named Informer, with three distinctive characteristics: (i) a $ProbSparse$ self-attention mechanism, which achieves $O(L \\log L)$ in time complexity and memory usage, and has comparable performance on sequences' dependency alignment. (ii) the self-attention distilling highlights dominating attention by halving cascading layer input, and efficiently handles extreme long input sequences. (iii) the generative style decoder, while conceptually simple, predicts the long time-series sequences at one forward operation rather than a step-by-step way, which drastically improves the inference speed of long-sequence predictions. Extensive experiments on four large-scale datasets demonstrate that Informer significantly outperforms existing methods and provides a new solution to the LSTF problem.",
				"extra": "ADS Bibcode: 2020arXiv201207436Z",
				"libraryCatalog": "NASA ADS",
				"shortTitle": "Informer",
				"url": "https://ui.adsabs.harvard.edu/abs/2020arXiv201207436Z",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Computer Science - Artificial Intelligence"
					},
					{
						"tag": "Computer Science - Information Retrieval"
					},
					{
						"tag": "Computer Science - Machine Learning"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://ui.adsabs.harvard.edu/abs/2023A%26ARv..31....1A/abstract",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Origin of the elements",
				"creators": [
					{
						"lastName": "Arcones",
						"firstName": "Almudena",
						"creatorType": "author"
					},
					{
						"lastName": "Thielemann",
						"firstName": "Friedrich-Karl",
						"creatorType": "author"
					}
				],
				"date": "2023-12-01",
				"DOI": "10.1007/s00159-022-00146-x",
				"ISSN": "0935-4956",
				"abstractNote": "What is the origin of the oxygen we breathe, the hydrogen and oxygen (in form of water H2O) in rivers and oceans, the carbon in all organic compounds, the silicon in electronic hardware, the calcium in our bones, the iron in steel, silver and gold in jewels, the rare earths utilized, e.g. in magnets or lasers, lead or lithium in batteries, and also of naturally occurring uranium and plutonium? The answer lies in the skies. Astrophysical environments from the Big Bang to stars and stellar explosions are the cauldrons where all these elements are made. The papers by Burbidge (Rev Mod Phys 29:547-650, 1957) and Cameron (Publ Astron Soc Pac 69:201, 1957), as well as precursors by Bethe, von Weizsäcker, Hoyle, Gamow, and Suess and Urey provided a very basic understanding of the nucleosynthesis processes responsible for their production, combined with nuclear physics input and required environment conditions such as temperature, density and the overall neutron/proton ratio in seed material. Since then a steady stream of nuclear experiments and nuclear structure theory, astrophysical models of the early universe as well as stars and stellar explosions in single and binary stellar systems has led to a deeper understanding. This involved improvements in stellar models, the composition of stellar wind ejecta, the mechanism of core-collapse supernovae as final fate of massive stars, and the transition (as a function of initial stellar mass) from core-collapse supernovae to hypernovae and long duration gamma-ray bursts (accompanied by the formation of a black hole) in case of single star progenitors. Binary stellar systems give rise to nova explosions, X-ray bursts, type Ia supernovae, neutron star, and neutron star-black hole mergers. All of these events (possibly with the exception of X-ray bursts) eject material with an abundance composition unique to the specific event and lead over time to the evolution of elemental (and isotopic) abundances in the galactic gas and their imprint on the next generation of stars. In the present review, we want to give a modern overview of the nucleosynthesis processes involved, their astrophysical sites, and their impact on the evolution of galaxies.",
				"extra": "ADS Bibcode: 2023A&ARv..31....1A",
				"libraryCatalog": "NASA ADS",
				"pages": "1",
				"publicationTitle": "Astronomy and Astrophysics Review",
				"url": "https://ui.adsabs.harvard.edu/abs/2023A&ARv..31....1A",
				"volume": "31",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Big Bang nucleosynthesis"
					},
					{
						"tag": "Compact binary mergers"
					},
					{
						"tag": "Core collapse"
					},
					{
						"tag": "Element abundance"
					},
					{
						"tag": "Galactic evolution"
					},
					{
						"tag": "Stellar evolution"
					},
					{
						"tag": "Supernovae"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
