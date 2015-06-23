{
	"translatorID": "7a81d945-7d9c-4f8c-bd7b-4226c1cab40e",
	"label": "Dryad Digital Repository",
	"creator": "Nathan Day",
	"target": "^https?://(?:www\\.)?datadryad\\.org/",
	"minVersion": "1.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "g",
	"lastUpdated": "2015-06-22 20:33:22"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2014 Dryad Digital Repository

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
	// Dryad search page
	var multiples = ZU.xpath(doc, '//li[contains(@class,"ds-artifact-item")]/div/a');
	if ((new RegExp(/^https?:\/\/(www\.)?datadryad\.org\/discover/)).test(url) &&
		multiples !== null && multiples.length > 0)
	{
		return 'multiple';
	} else {
		var result = ZU.xpathText(doc,'//meta[@name="DC.type"][1]/@content');
		// Dryad data package
		if (result === 'Article') {
			return 'journalArticle';
		// Dryad data file
		} else if (result === 'Dataset') {
			//return 'dataset';
			return 'journalArticle';
		}
	}
	return false;
}

function doWeb(doc, url) {
	var itemType = detectWeb(doc, url);
	if (itemType === 'journalArticle') {
		var package_doi = ZU.xpathText(doc, '//meta[@name="DCTERMS.isPartOf"]/@content');
		var translator = Zotero.loadTranslator('import');
		// use the Embedded Metadata translator
		translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
		translator.setHandler('itemDone', function(doc, item) {
			var itemDoi   	= item.url.replace(/^.*?doi:/, '');
			item.DOI      	= itemDoi;
			item.itemID   	= itemDoi;      // internal value for seeAlso relation
			item.url      	= '';           // the doi value is to be used in lieu of the url
			item.itemType 	= itemType;
			// Add a .seeAlso value if this is a page for a single data file,
			// rather than for a data package collection.
			// This is a data file if there is a DCTERMS.isPartOf property.
			if (package_doi && package_doi !== 'doi:'.concat(itemDoi)) {
				item.seeAlso = ['http://dx.doi.org/' + package_doi.substring(4)];
			}
			// signal a dataset until supported per
			// https://www.zotero.org/support/dev/translators/datasets
			item.extra = '{:itemType: dataset}';
			item.archive = 'Dryad Digital Repository';
			item.attachments = [];
			item.shortTitle = '';
			item.complete();
		});
		translator.getTranslatorObject(function (obj) {
			obj.doWeb(doc, url);
		});
		// Value for page's possible DCTERMS.isPartOf <meta> tag,
		// minus the initial 'doi:'.
		// This value is used to set the seeAlso value for a data-file record.
		if (package_doi) {
			ZU.processDocuments('http://datadryad.org/resource/' + package_doi, doWeb);
		}
	} else if (itemType === 'multiple') {
		var urls = ZU.xpath(doc, '//li[contains(@class,"ds-artifact-item")]/div/a');
		if (urls.length > 0) {
			for (var i = 0; i < urls.length; i++) {
				urls[i] = urls[i].href;
			}
			ZU.processDocuments(urls, function (d) {
				doWeb(d, d.location.href);
			});
		}
	}
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://datadryad.org/resource/doi:10.5061/dryad.9025",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Data from: Phylogenetic analyses of mitochondrial and nuclear data in haematophagous flies support the paraphyly of the genus Stomoxys (Diptera: Muscidae)",
				"creators": [
					{
						"firstName": "Najla",
						"lastName": "Dsouli",
						"creatorType": "author"
					},
					{
						"firstName": "Frédéric",
						"lastName": "Delsuc",
						"creatorType": "author"
					},
					{
						"firstName": "Johan",
						"lastName": "Michaux",
						"creatorType": "author"
					},
					{
						"firstName": "Eric",
						"lastName": "De Stordeur",
						"creatorType": "author"
					},
					{
						"firstName": "Arnaud",
						"lastName": "Couloux",
						"creatorType": "author"
					},
					{
						"firstName": "Michel",
						"lastName": "Veuille",
						"creatorType": "author"
					},
					{
						"firstName": "Gérard",
						"lastName": "Duvallet",
						"creatorType": "author"
					}
				],
				"date": "2011-02-13",
				"DOI": "10.5061/dryad.9025",
				"abstractNote": "The genus Stomoxys Geoffroy (Diptera; Muscidae) contains species of parasitic flies that are of medical and economic importance. We conducted a phylogenetic analysis including 10 representative species of the genus including multiple exemplars, together with the closely related genera Prostomoxys Zumpt, Haematobosca Bezzi, and Haematobia Lepeletier & Serville. Phylogenetic relationships were inferred using maximum likelihood and Bayesian methods from DNA fragments from the cytochrome c oxidase subunit I (COI, 753 bp) and cytochrome b (CytB, 587 bp) mitochondrial genes, and the nuclear ribosomal internal transcribed spacer 2 (ITS2, 426 bp). The combination of mitochondrial and nuclear data strongly supports the paraphyly of the genus Stomoxys because of the inclusion of Prostomoxys saegerae Zumpt. This unexpected result suggests that Prostomoxys should be renamed into Stomoxys. Also, the deep molecular divergence observed between the subspecies Stomoxys niger niger Macquart and S. niger bilineatus Grünbreg led us to propose that they should rather be considered as distinct species, in agreement with ecological data. Bayesian phylogenetic analyses support three distinct lineages within the genus Stomoxys with a strong biogeographical component. The first lineage consists solely of the divergent Asian species S. indicus Picard which appears as the sister-group to all remaining Stomoxys species. The second clade groups the strictly African species Stomoxys inornatus Grünbreg, Stomoxys transvittatus Villeneuve, Stomoxys omega Newstead, and Stomoxys pallidus Roubaud. Finally, the third clade includes both African occurring and more widespread species such as the livestock pest Stomoxys calcitrans Linnaeus. Divergence time estimates indicate that the genus Stomoxys originated in the late Oligocene around 30 million years ago, with the major lineages diversifying in the Early Miocene between 20 and 15 million years ago at a time when temperate forests developed in the Northern Hemisphere.",
				"archive": "Dryad Digital Repository",
				"extra": "{:itemType: dataset}",
				"itemID": "10.5061/dryad.9025",
				"libraryCatalog": "datadryad.org",
				"attachments": [],
				"tags": [
					"Molecular dating",
					"Phylogenetic relationship",
					"Stomoxys flies"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://datadryad.org/resource/doi:10.5061/dryad.9025/2",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Dsouli-InfectGenetEvol11 phylogram",
				"creators": [
					{
						"firstName": "Najla",
						"lastName": "Dsouli",
						"creatorType": "author"
					},
					{
						"firstName": "Frédéric",
						"lastName": "Delsuc",
						"creatorType": "author"
					},
					{
						"firstName": "Johan",
						"lastName": "Michaux",
						"creatorType": "author"
					},
					{
						"firstName": "Eric",
						"lastName": "De Stordeur",
						"creatorType": "author"
					},
					{
						"firstName": "Arnaud",
						"lastName": "Couloux",
						"creatorType": "author"
					},
					{
						"firstName": "Michel",
						"lastName": "Veuille",
						"creatorType": "author"
					},
					{
						"firstName": "Gérard",
						"lastName": "Duvallet",
						"creatorType": "author"
					}
				],
				"date": "2011-03-31",
				"DOI": "10.5061/dryad.9025/2",
				"abstractNote": "This phylogram is the 50% majority\r\nrule consensus tree presented in Figure 1. It was obtained with Bayesian inference using MrBayes under the GTR + G model. Numbers at nodes indicate posterior probabilities (PP).",
				"archive": "Dryad Digital Repository",
				"extra": "{:itemType: dataset}",
				"itemID": "10.5061/dryad.9025/2",
				"libraryCatalog": "datadryad.org",
				"rights": "http://creativecommons.org/publicdomain/zero/1.0/",
				"attachments": [],
				"tags": [
					"Molecular dating",
					"Phylogenetic relationship",
					"Stomoxys flies"
				],
				"notes": [],
				"seeAlso": [
					"http://datadryad.org/resource/doi:10.5061/dryad.9025"
				]
			},
			{
				"itemType": "journalArticle",
				"title": "Data from: Phylogenetic analyses of mitochondrial and nuclear data in haematophagous flies support the paraphyly of the genus Stomoxys (Diptera: Muscidae)",
				"creators": [
					{
						"firstName": "Najla",
						"lastName": "Dsouli",
						"creatorType": "author"
					},
					{
						"firstName": "Frédéric",
						"lastName": "Delsuc",
						"creatorType": "author"
					},
					{
						"firstName": "Johan",
						"lastName": "Michaux",
						"creatorType": "author"
					},
					{
						"firstName": "Eric",
						"lastName": "De Stordeur",
						"creatorType": "author"
					},
					{
						"firstName": "Arnaud",
						"lastName": "Couloux",
						"creatorType": "author"
					},
					{
						"firstName": "Michel",
						"lastName": "Veuille",
						"creatorType": "author"
					},
					{
						"firstName": "Gérard",
						"lastName": "Duvallet",
						"creatorType": "author"
					}
				],
				"date": "2011-02-13",
				"DOI": "10.5061/dryad.9025",
				"abstractNote": "The genus Stomoxys Geoffroy (Diptera; Muscidae) contains species of parasitic flies that are of medical and economic importance. We conducted a phylogenetic analysis including 10 representative species of the genus including multiple exemplars, together with the closely related genera Prostomoxys Zumpt, Haematobosca Bezzi, and Haematobia Lepeletier & Serville. Phylogenetic relationships were inferred using maximum likelihood and Bayesian methods from DNA fragments from the cytochrome c oxidase subunit I (COI, 753 bp) and cytochrome b (CytB, 587 bp) mitochondrial genes, and the nuclear ribosomal internal transcribed spacer 2 (ITS2, 426 bp). The combination of mitochondrial and nuclear data strongly supports the paraphyly of the genus Stomoxys because of the inclusion of Prostomoxys saegerae Zumpt. This unexpected result suggests that Prostomoxys should be renamed into Stomoxys. Also, the deep molecular divergence observed between the subspecies Stomoxys niger niger Macquart and S. niger bilineatus Grünbreg led us to propose that they should rather be considered as distinct species, in agreement with ecological data. Bayesian phylogenetic analyses support three distinct lineages within the genus Stomoxys with a strong biogeographical component. The first lineage consists solely of the divergent Asian species S. indicus Picard which appears as the sister-group to all remaining Stomoxys species. The second clade groups the strictly African species Stomoxys inornatus Grünbreg, Stomoxys transvittatus Villeneuve, Stomoxys omega Newstead, and Stomoxys pallidus Roubaud. Finally, the third clade includes both African occurring and more widespread species such as the livestock pest Stomoxys calcitrans Linnaeus. Divergence time estimates indicate that the genus Stomoxys originated in the late Oligocene around 30 million years ago, with the major lineages diversifying in the Early Miocene between 20 and 15 million years ago at a time when temperate forests developed in the Northern Hemisphere.",
				"archive": "Dryad Digital Repository",
				"extra": "{:itemType: dataset}",
				"itemID": "10.5061/dryad.9025",
				"libraryCatalog": "datadryad.org",
				"attachments": [],
				"tags": [
					"Molecular dating",
					"Phylogenetic relationship",
					"Stomoxys flies"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://datadryad.org/discover?query=&submit=Go&fq=dc.subject%3APhylogenetic+relationship&filtertype=*&filter=&rpp=5&sort_by=score&order=DESC",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Data from: Phylogenetic analyses of mitochondrial and nuclear data in haematophagous flies support the paraphyly of the genus Stomoxys (Diptera: Muscidae)",
				"creators": [
					{
						"firstName": "Najla",
						"lastName": "Dsouli",
						"creatorType": "author"
					},
					{
						"firstName": "Frédéric",
						"lastName": "Delsuc",
						"creatorType": "author"
					},
					{
						"firstName": "Johan",
						"lastName": "Michaux",
						"creatorType": "author"
					},
					{
						"firstName": "Eric",
						"lastName": "De Stordeur",
						"creatorType": "author"
					},
					{
						"firstName": "Arnaud",
						"lastName": "Couloux",
						"creatorType": "author"
					},
					{
						"firstName": "Michel",
						"lastName": "Veuille",
						"creatorType": "author"
					},
					{
						"firstName": "Gérard",
						"lastName": "Duvallet",
						"creatorType": "author"
					}
				],
				"date": "2011-02-13",
				"DOI": "10.5061/dryad.9025",
				"abstractNote": "The genus Stomoxys Geoffroy (Diptera; Muscidae) contains species of parasitic flies that are of medical and economic importance. We conducted a phylogenetic analysis including 10 representative species of the genus including multiple exemplars, together with the closely related genera Prostomoxys Zumpt, Haematobosca Bezzi, and Haematobia Lepeletier & Serville. Phylogenetic relationships were inferred using maximum likelihood and Bayesian methods from DNA fragments from the cytochrome c oxidase subunit I (COI, 753 bp) and cytochrome b (CytB, 587 bp) mitochondrial genes, and the nuclear ribosomal internal transcribed spacer 2 (ITS2, 426 bp). The combination of mitochondrial and nuclear data strongly supports the paraphyly of the genus Stomoxys because of the inclusion of Prostomoxys saegerae Zumpt. This unexpected result suggests that Prostomoxys should be renamed into Stomoxys. Also, the deep molecular divergence observed between the subspecies Stomoxys niger niger Macquart and S. niger bilineatus Grünbreg led us to propose that they should rather be considered as distinct species, in agreement with ecological data. Bayesian phylogenetic analyses support three distinct lineages within the genus Stomoxys with a strong biogeographical component. The first lineage consists solely of the divergent Asian species S. indicus Picard which appears as the sister-group to all remaining Stomoxys species. The second clade groups the strictly African species Stomoxys inornatus Grünbreg, Stomoxys transvittatus Villeneuve, Stomoxys omega Newstead, and Stomoxys pallidus Roubaud. Finally, the third clade includes both African occurring and more widespread species such as the livestock pest Stomoxys calcitrans Linnaeus. Divergence time estimates indicate that the genus Stomoxys originated in the late Oligocene around 30 million years ago, with the major lineages diversifying in the Early Miocene between 20 and 15 million years ago at a time when temperate forests developed in the Northern Hemisphere.",
				"archive": "Dryad Digital Repository",
				"extra": "{:itemType: dataset}",
				"itemID": "10.5061/dryad.9025",
				"libraryCatalog": "datadryad.org",
				"attachments": [],
				"tags": [
					"Molecular dating",
					"Phylogenetic relationship",
					"Stomoxys flies"
				],
				"notes": [],
				"seeAlso": []
			},
			{
				"itemType": "journalArticle",
				"title": "Data from: Molecular phylogeny of living xenarthrans and the impact of character and taxon sampling on the placental tree rooting",
				"creators": [
					{
						"firstName": "Frédéric",
						"lastName": "Delsuc",
						"creatorType": "author"
					},
					{
						"firstName": "Mark",
						"lastName": "Scally",
						"creatorType": "author"
					},
					{
						"firstName": "Ole",
						"lastName": "Madsen",
						"creatorType": "author"
					},
					{
						"firstName": "Michael J.",
						"lastName": "Stanhope",
						"creatorType": "author"
					},
					{
						"firstName": "Wilfried W.",
						"lastName": "de Jong",
						"creatorType": "author"
					},
					{
						"firstName": "François M.",
						"lastName": "Catzeflis",
						"creatorType": "author"
					},
					{
						"firstName": "Mark S.",
						"lastName": "Springer",
						"creatorType": "author"
					},
					{
						"firstName": "Emmanuel J. P.",
						"lastName": "Douzery",
						"creatorType": "author"
					}
				],
				"date": "2002-10",
				"DOI": "10.5061/dryad.1831",
				"abstractNote": "Extant xenarthrans (armadillos, anteaters and sloths) are among the most derived placental mammals ever evolved. South America was the cradle of their evolutionary history. During the Tertiary, xenarthrans experienced an extraordinary radiation, whereas South America remained isolated from other continents. The 13 living genera are relics of this earlier diversification and represent one of the four major clades of placental mammals. Sequences of the three independent protein-coding nuclear markers alpha2B adrenergic receptor (ADRA2B), breast cancer susceptibility (BRCA1), and von Willebrand Factor (VWF) were determined for 12 of the 13 living xenarthran genera. Comparative evolutionary dynamics of these nuclear exons using a likelihood framework revealed contrasting patterns of molecular evolution. All codon positions of BRCA1 were shown to evolve in a strikingly similar manner, and third codon positions appeared less saturated within placentals than those of ADRA2B and VWF. Maximum likelihood and Bayesian phylogenetic analyses of a 47 placental taxa data set rooted by three marsupial outgroups resolved the phylogeny of Xenarthra with some evidence for two radiation events in armadillos and provided a strongly supported picture of placental interordinal relationships. This topology was fully compatible with recent studies, dividing placentals into the Southern Hemisphere clades Afrotheria and Xenarthra and a monophyletic Northern Hemisphere clade (Boreoeutheria) composed of Laurasiatheria and Euarchontoglires. Partitioned likelihood statistical tests of the position of the root, under different character partition schemes, identified three almost equally likely hypotheses for early placental divergences: a basal Afrotheria, an Afrotheria + Xenarthra clade, or a basal Xenarthra (Epitheria hypothesis). We took advantage of the extensive sampling realized within Xenarthra to assess its impact on the location of the root on the placental tree. By resampling taxa within Xenarthra, the conservative Shimodaira-Hasegawa likelihood-based test of alternative topologies was shown to be sensitive to both character and taxon sampling.",
				"archive": "Dryad Digital Repository",
				"extra": "{:itemType: dataset}",
				"itemID": "10.5061/dryad.1831",
				"libraryCatalog": "datadryad.org",
				"attachments": [],
				"tags": [
					"Bayesian phylogenetics",
					"evolutionary dynamics",
					"maximum likelihood",
					"nuclear markers",
					"placentals",
					"taxon and character sampling",
					"xenarthran phylogeny"
				],
				"notes": [],
				"seeAlso": []
			},
			{
				"itemType": "journalArticle",
				"title": "Data from: Dispersal to or from an African biodiversity hotspot?",
				"creators": [
					{
						"firstName": "David C.",
						"lastName": "Blackburn",
						"creatorType": "author"
					},
					{
						"firstName": "John",
						"lastName": "Measey",
						"creatorType": "author"
					}
				],
				"date": "2009-03-25",
				"DOI": "10.5061/dryad.1272",
				"abstractNote": "Biodiversity hotspots are centers of endemism and thus contain many range-restricted species. In addition, within these hotspots are often widespread species that might have originated within a hotspot before dispersing to neighboring or distant regions. We test this hypothesis through a phylogeographic analysis of a miniature leaf litter frog, Arthroleptis xenodactyloides, that has a large distribution throughout the Eastern Arc, a biodiversity hotspot, and other regions in East Africa. Maximum likelihood and Bayesian estimates of the mitochondrial gene phylogeny are used as a proxy for understanding the evolutionary history of diversification and the historical relationships between populations. The north-south range of this species extends for approximately 1900 km; our sampling covers approximately 85% of this range. Using phylogenetic comparative methods, we estimate the region of origin and direction of dispersal within A. xenodactyloides. We compare contrasting hypotheses of latitudinal range expansion using bayes factors. The ancestral region of origin of A. xenodactyloides is reconstructed as having occurred within the Eastern Arc before dispersing southwards into the Southern Rift mountains, probably in the Pleistocene. The phylogeographic structure within this leaf litter frog is surprisingly similar to that of forest birds, revealing that similar geographic features might have had a driving role in diversification of these very dissimilar taxa. Latitudinal expansion occurred early in the evolutionary history of A. xenodactyloides and may indicate that physiological adaptation facilitated its wide geographic distribution.",
				"archive": "Dryad Digital Repository",
				"extra": "{:itemType: dataset}",
				"itemID": "10.5061/dryad.1272",
				"libraryCatalog": "datadryad.org",
				"attachments": [],
				"tags": [
					"Arthroleptidae",
					"Mitochondrial Genetics",
					"Phylogenetic Comparative Methods",
					"Phylogeography",
					"Range Expansion",
					"Speciation"
				],
				"notes": [],
				"seeAlso": []
			},
			{
				"itemType": "journalArticle",
				"title": "Data from: An ancient origin for the enigmatic Flat-Headed Frogs (Bombinatoridae: Barbourula) from the islands of Southeast Asia",
				"creators": [
					{
						"firstName": "David C.",
						"lastName": "Blackburn",
						"creatorType": "author"
					},
					{
						"firstName": "David P.",
						"lastName": "Bickford",
						"creatorType": "author"
					},
					{
						"firstName": "Arvin C.",
						"lastName": "Diesmos",
						"creatorType": "author"
					},
					{
						"firstName": "Djoko T.",
						"lastName": "Iskandar",
						"creatorType": "author"
					},
					{
						"firstName": "Rafe M.",
						"lastName": "Brown",
						"creatorType": "author"
					}
				],
				"date": "2010-08-27",
				"DOI": "10.5061/dryad.1914",
				"abstractNote": "Background: The complex history of Southeast Asian islands has long been of interest to biogeographers. Dispersal and\r\nvicariance events in the Pleistocene have received the most attention, though recent studies suggest a potentially more\r\nancient history to components of the terrestrial fauna. Among this fauna is the enigmatic archaeobatrachian frog genus\r\nBarbourula, which only occurs on the islands of Borneo and Palawan. We utilize this lineage to gain unique insight into the\r\ntemporal history of lineage diversification in Southeast Asian islands.\r\nMethodology/Principal Findings: Using mitochondrial and nuclear genetic data, multiple fossil calibration points, and\r\nlikelihood and Bayesian methods, we estimate phylogenetic relationships and divergence times for Barbourula. We determine\r\nthe sensitivity of focal divergence times to specific calibration points by jackknife approach in which each calibration point is\r\nexcluded from analysis. We find that relevant divergence time estimates are robust to the exclusion of specific calibration\r\npoints. Barbourula is recovered as a monophyletic lineage nested within a monophyletic Costata. Barbourula diverged from its\r\nsister taxon Bombina in the Paleogene and the two species of Barbourula diverged in the Late Miocene.\r\nConclusions/Significance: The divergences within Barbourula and between it and Bombina are surprisingly old and\r\nrepresent the oldest estimates for a cladogenetic event resulting in living taxa endemic to Southeast Asian islands.\r\nMoreover, these divergence time estimates are consistent with a new biogeographic scenario: the Palawan Ark Hypothesis.\r\nWe suggest that components of Palawan’s terrestrial fauna might have ‘‘rafted’’ on emergent portions of the North Palawan\r\nBlock during its migration from the Asian mainland to its present-day position near Borneo. Further, dispersal from Palawan\r\nto Borneo (rather than Borneo to Palawan) may explain the current day disjunct distribution of this ancient lineage.",
				"archive": "Dryad Digital Repository",
				"extra": "{:itemType: dataset}",
				"itemID": "10.5061/dryad.1914",
				"libraryCatalog": "datadryad.org",
				"attachments": [],
				"tags": [
					"Biogeography",
					"Divergence Time Estimation",
					"Phylogenetics"
				],
				"notes": [],
				"seeAlso": []
			},
			{
				"itemType": "journalArticle",
				"title": "Data from: Step matrices and the interpretation of homoplasy",
				"creators": [
					{
						"firstName": "Richard H.",
						"lastName": "Ree",
						"creatorType": "author"
					},
					{
						"firstName": "Michael J.",
						"lastName": "Donoghue",
						"creatorType": "author"
					}
				],
				"date": "1998-12-30",
				"DOI": "10.5061/dryad.119",
				"abstractNote": "Assumptions about the costs of character change, coded in the form of a step matrix, determine most-parsimonious inferences of character evolution on phylogenies. We present a graphical approach to exploring the relationship between cost assumptions and evolutionary inferences from character data. The number of gains and losses of a binary trait on a phylogeny can be plotted over a range of cost assumptions, to reveal the inflection point at which there is a switch from more gains to more losses and the point at which all changes are inferred to be in one direction or the other. Phylogenetic structure in the data, the tree shape, and the relative frequency of states among the taxa influence the shape of such graphs and complicate the interpretation of possible permutation-based tests for directionality of change. The costs at which the most-parsimonious state of each internal node switches from one state to another can also be quantified by iterative ancestral-state reconstruction over a range of costs. This procedure helps identify the most robust inferences of change in each direction, which should be of use in designing comparative studies.",
				"archive": "Dryad Digital Repository",
				"extra": "{:itemType: dataset}",
				"itemID": "10.5061/dryad.119",
				"language": "en_US",
				"libraryCatalog": "datadryad.org",
				"attachments": [],
				"tags": [
					"ancestral states",
					"character evolution",
					"homoplasy",
					"parsimony",
					"phylogenetic inference"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/