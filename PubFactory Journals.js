{
	"translatorID": "8d1fb775-df6d-4069-8830-1dfe8e8387dd",
	"label": "PubFactory Journals",
	"creator": "Brendan O'Connell",
	"target": "^https?:\\/\\/(?:[\\w-]+\\.)+[\\w-]+(?:\\/[^\\/\\s]*)+\\.xml(?:\\?.*)?$|^https:\\/\\/(?:[\\w-]+\\.)+[\\w-]+\\/search\\?[^\\/\\s]*source=%2Fjournals%2F\\w+%2F\\w+-overview\\.xml(?:&q=[^&\\s]*)?$",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-03-29 13:58:05"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2023 Brendan O'Connell

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

function detectWeb(doc) {
	// EM works well on single articles, so detectWeb() isn't strictly necessary for them.
	// However, single articles are included in this translator
	// so that 'multiple' doesn't get called for articles with "Related Items"
	// e.g. https://avmajournals.avma.org/view/journals/javma/261/4/javma.22.11.0518.xml
	// because there are multiple items that match the rows selector in getSearchResults and
	// haven't found a way to write a querySelectorAll() that only matches the main article on single pages
	// with related items.
	if (doc.querySelector('meta[name="citation_title"]')) {
		return "journalArticle";
	}
	else if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('a.c-Button--link[href*="/view/journals/"][href$=".xml"][target="_self"]');
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(row.innerText);
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
	if (doc.querySelector('meta[name="citation_pdf_url"]')) {
		var pdfURL = doc.querySelector('meta[name="citation_pdf_url"]').getAttribute("content");
	}
	let translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);

	translator.setHandler('itemDone', (_obj, item) => {
		// remove word "Abstract" from abstract if present, e.g. https://journals.ametsoc.org/view/journals/atsc/72/8/jas-d-14-0363.1.xml
		var abstract = doc.querySelector('meta[property="og:description"]').content;
		if (abstract.startsWith("Abstract")) {
			var cleanAbstract = abstract.substring(8); // remove the first 8 characters ("Abstract ")
			item.abstractNote = cleanAbstract;
		}
		if (pdfURL) {
			item.attachments = [];
			item.attachments.push({
				url: pdfURL,
				title: 'Full Text PDF',
				mimeType: 'application/pdf'
			});
		}
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
		"url": "https://journals.ametsoc.org/view/journals/amsm/59/1/amsm.59.issue-1.xml",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://journals.humankinetics.com/view/journals/cssm/12/1/cssm.2022-0019.xml",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Learning How to Make Decisions in a Nonprofit Sport Organization: An Application of Strategic Decision-Making Theory",
				"creators": [
					{
						"firstName": "Erik L.",
						"lastName": "Lachance",
						"creatorType": "author"
					}
				],
				"date": "2023/01/01",
				"DOI": "10.1123/cssm.2022-0019",
				"ISSN": "2167-2458, 2372-5540",
				"abstractNote": "This teaching-based case study tasks students with analyzing a strategic decision. This analysis is guided by a script describing a strategic decision undertaken in a fictional nonprofit sport organization (i.e., Canadian Ice Tennis Federation). Students’ analysis is achieved by applying strategic decision-making theory, including its five central constructs: centrality, duration, flow, interaction, and scrutiny. Knowledge is gained by analyzing a strategic decision according to its level of authorization, length, delays, negotiations, and information sources. This teaching-based case study is intended for undergraduate students in general sport management and/or strategy/strategic management courses. The benefit of this teaching-based case study resides in its ability to teach students how to make decisions, a central and ubiquitous task in organizational life, and their future endeavors in the sport industry.",
				"issue": "1",
				"language": "en",
				"libraryCatalog": "journals.humankinetics.com",
				"pages": "1-5",
				"publicationTitle": "Case Studies in Sport Management",
				"shortTitle": "Learning How to Make Decisions in a Nonprofit Sport Organization",
				"url": "https://journals.humankinetics.com/view/journals/cssm/12/1/cssm.2022-0019.xml",
				"volume": "12",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "decision-making process"
					},
					{
						"tag": "not-for-profit sport organizations"
					},
					{
						"tag": "strategic decisions"
					},
					{
						"tag": "strategic management"
					},
					{
						"tag": "strategy"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://journals.humankinetics.com/view/journals/jab/jab-overview.xml",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://avmajournals.avma.org/view/journals/javma/javma-overview.xml?_gl=1*1mk7zsf*_ga*MTI2MDA0NjE4NS4xNjc5NTc4NzIy*_ga_L7SBEK6H36*MTY3OTU3ODcyMS4xLjEuMTY3OTU3ODg0NS4wLjAuMA..",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://journals.humankinetics.com/view/journals/ijsnem/33/2/ijsnem.2022-0142.xml",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Fasted Sprint Interval Training Results in Some Beneficial Skeletal Muscle Metabolic, but Similar Metabolomic and Performance Adaptations Compared With Carbohydrate-Fed Training in Recreationally Active Male",
				"creators": [
					{
						"firstName": "Tom P.",
						"lastName": "Aird",
						"creatorType": "author"
					},
					{
						"firstName": "Andrew J.",
						"lastName": "Farquharson",
						"creatorType": "author"
					},
					{
						"firstName": "Kate M.",
						"lastName": "Bermingham",
						"creatorType": "author"
					},
					{
						"firstName": "Aifric",
						"lastName": "O’Sullivan",
						"creatorType": "author"
					},
					{
						"firstName": "Janice E.",
						"lastName": "Drew",
						"creatorType": "author"
					},
					{
						"firstName": "Brian P.",
						"lastName": "Carson",
						"creatorType": "author"
					}
				],
				"date": "2023/03/01",
				"DOI": "10.1123/ijsnem.2022-0142",
				"ISSN": "1543-2742, 1526-484X",
				"abstractNote": "Endurance training in fasted conditions (FAST) induces favorable skeletal muscle metabolic adaptations compared with carbohydrate feeding (CHO), manifesting in improved exercise performance over time. Sprint interval training (SIT) is a potent metabolic stimulus, however nutritional strategies to optimize adaptations to SIT are poorly characterized. Here we investigated the efficacy of FAST versus CHO SIT (4–6 × 30-s Wingate sprints interspersed with 4-min rest) on muscle metabolic, serum metabolome and exercise performance adaptations in a double-blind parallel group design in recreationally active males. Following acute SIT, we observed exercise-induced increases in pan-acetylation and several genes associated with mitochondrial biogenesis, fatty acid oxidation, and NAD+-biosynthesis, along with favorable regulation of PDK4 (p = .004), NAMPT (p = .0013), and NNMT (p = .001) in FAST. Following 3 weeks of SIT, NRF2 (p = .029) was favorably regulated in FAST, with augmented pan-acetylation in CHO but not FAST (p = .033). SIT induced increases in maximal citrate synthase activity were evident with no effect of nutrition, while 3-hydroxyacyl-CoA dehydrogenase activity did not change. Despite no difference in the overall serum metabolome, training-induced changes in C3:1 (p = .013) and C4:1 (p = .010) which increased in FAST, and C16:1 (p = .046) and glutamine (p = .021) which increased in CHO, were different between groups. Training-induced increases in anaerobic (p = .898) and aerobic power (p = .249) were not influenced by nutrition. These findings suggest some beneficial muscle metabolic adaptations are evident in FAST versus CHO SIT following acute exercise and 3 weeks of SIT. However, this stimulus did not manifest in differential exercise performance adaptations.",
				"issue": "2",
				"language": "en",
				"libraryCatalog": "journals.humankinetics.com",
				"pages": "73-83",
				"publicationTitle": "International Journal of Sport Nutrition and Exercise Metabolism",
				"url": "https://journals.humankinetics.com/view/journals/ijsnem/33/2/ijsnem.2022-0142.xml",
				"volume": "33",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "exercise"
					},
					{
						"tag": "fasted"
					},
					{
						"tag": "fasting"
					},
					{
						"tag": "metabolism"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://thejns.org/view/journals/j-neurosurg/138/3/article-p587.xml",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Intraoperative confocal laser endomicroscopy: prospective in vivo feasibility study of a clinical-grade system for brain tumors",
				"creators": [
					{
						"firstName": "Irakliy",
						"lastName": "Abramov",
						"creatorType": "author"
					},
					{
						"firstName": "Marian T.",
						"lastName": "Park",
						"creatorType": "author"
					},
					{
						"firstName": "Evgenii",
						"lastName": "Belykh",
						"creatorType": "author"
					},
					{
						"firstName": "Alexander B.",
						"lastName": "Dru",
						"creatorType": "author"
					},
					{
						"firstName": "Yuan",
						"lastName": "Xu",
						"creatorType": "author"
					},
					{
						"firstName": "Timothy C.",
						"lastName": "Gooldy",
						"creatorType": "author"
					},
					{
						"firstName": "Lea",
						"lastName": "Scherschinski",
						"creatorType": "author"
					},
					{
						"firstName": "S. Harrison",
						"lastName": "Farber",
						"creatorType": "author"
					},
					{
						"firstName": "Andrew S.",
						"lastName": "Little",
						"creatorType": "author"
					},
					{
						"firstName": "Randall W.",
						"lastName": "Porter",
						"creatorType": "author"
					},
					{
						"firstName": "Kris A.",
						"lastName": "Smith",
						"creatorType": "author"
					},
					{
						"firstName": "Michael T.",
						"lastName": "Lawton",
						"creatorType": "author"
					},
					{
						"firstName": "Jennifer M.",
						"lastName": "Eschbacher",
						"creatorType": "author"
					},
					{
						"firstName": "Mark C.",
						"lastName": "Preul",
						"creatorType": "author"
					}
				],
				"date": "2022/07/08",
				"DOI": "10.3171/2022.5.JNS2282",
				"ISSN": "1933-0693, 0022-3085",
				"abstractNote": "OBJECTIVE The authors evaluated the feasibility of using the first clinical-grade confocal laser endomicroscopy (CLE) system using fluorescein sodium for intraoperative in vivo imaging of brain tumors. METHODS A CLE system cleared by the FDA was used in 30 prospectively enrolled patients with 31 brain tumors (13 gliomas, 5 meningiomas, 6 other primary tumors, 3 metastases, and 4 reactive brain tissue). A neuropathologist classified CLE images as interpretable or noninterpretable. Images were compared with corresponding frozen and permanent histology sections, with image correlation to biopsy location using neuronavigation. The specificities and sensitivities of CLE images and frozen sections were calculated using permanent histological sections as the standard for comparison. A recently developed surgical telepathology software platform was used in 11 cases to provide real-time intraoperative consultation with a neuropathologist. RESULTS Overall, 10,713 CLE images from 335 regions of interest were acquired. The mean duration of the use of the CLE system was 7 minutes (range 3–18 minutes). Interpretable CLE images were obtained in all cases. The first interpretable image was acquired within a mean of 6 (SD 10) images and within the first 5 (SD 13) seconds of imaging; 4896 images (46%) were interpretable. Interpretable image acquisition was positively correlated with study progression, number of cases per surgeon, cumulative length of CLE time, and CLE time per case (p ≤ 0.01). The diagnostic accuracy, sensitivity, and specificity of CLE compared with frozen sections were 94%, 94%, and 100%, respectively, and the diagnostic accuracy, sensitivity, and specificity of CLE compared with permanent histological sections were 92%, 90%, and 94%, respectively. No difference was observed between lesion types for the time to first interpretable image (p = 0.35). Deeply located lesions were associated with a higher percentage of interpretable images than superficial lesions (p = 0.02). The study met the primary end points, confirming the safety and feasibility and acquisition of noninvasive digital biopsies in all cases. The study met the secondary end points for the duration of CLE use necessary to obtain interpretable images. A neuropathologist could interpret the CLE images in 29 (97%) of 30 cases. CONCLUSIONS The clinical-grade CLE system allows in vivo, intraoperative, high-resolution cellular visualization of tissue microstructure and identification of lesional tissue patterns in real time, without the need for tissue preparation.",
				"issue": "3",
				"language": "EN",
				"libraryCatalog": "thejns.org",
				"pages": "587-597",
				"publicationTitle": "Journal of Neurosurgery",
				"shortTitle": "Intraoperative confocal laser endomicroscopy",
				"url": "https://thejns.org/view/journals/j-neurosurg/138/3/article-p587.xml",
				"volume": "138",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "confocal laser endomicroscopy"
					},
					{
						"tag": "fluorescence-guided surgery"
					},
					{
						"tag": "intraoperative diagnosis"
					},
					{
						"tag": "neuropathology"
					},
					{
						"tag": "neurosurgery"
					},
					{
						"tag": "oncology"
					},
					{
						"tag": "telemedicine"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://journals.ametsoc.org/view/journals/atsc/72/8/jas-d-14-0363.1.xml",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Observations of Ice Microphysics through the Melting Layer",
				"creators": [
					{
						"firstName": "Andrew J.",
						"lastName": "Heymsfield",
						"creatorType": "author"
					},
					{
						"firstName": "Aaron",
						"lastName": "Bansemer",
						"creatorType": "author"
					},
					{
						"firstName": "Michael R.",
						"lastName": "Poellot",
						"creatorType": "author"
					},
					{
						"firstName": "Norm",
						"lastName": "Wood",
						"creatorType": "author"
					}
				],
				"date": "2015/08/01",
				"DOI": "10.1175/JAS-D-14-0363.1",
				"ISSN": "0022-4928, 1520-0469",
				"abstractNote": "The detailed microphysical processes and properties within the melting layer (ML)—the continued growth of the aggregates by the collection of the small particles, the breakup of these aggregates, the effects of relative humidity on particle melting—are largely unresolved. This study focuses on addressing these questions for in-cloud heights from just above to just below the ML. Observations from four field programs employing in situ measurements from above to below the ML are used to characterize the microphysics through this region. With increasing temperatures from about −4° to +1°C, and for saturated conditions, slope and intercept parameters of exponential fits to the particle size distributions (PSD) fitted to the data continue to decrease downward, the maximum particle size (largest particle sampled for each 5-s PSD) increases, and melting proceeds from the smallest to the largest particles. With increasing temperature from about −4° to +2°C for highly subsaturated conditions, the PSD slope and intercept continue to decrease downward, the maximum particle size increases, and there is relatively little melting, but all particles experience sublimation.",
				"issue": "8",
				"language": "EN",
				"libraryCatalog": "journals.ametsoc.org",
				"pages": "2902-2928",
				"publicationTitle": "Journal of the Atmospheric Sciences",
				"url": "https://journals.ametsoc.org/view/journals/atsc/72/8/jas-d-14-0363.1.xml",
				"volume": "72",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Cloud microphysics"
					},
					{
						"tag": "Cloud retrieval"
					},
					{
						"tag": "Cloud water/phase"
					},
					{
						"tag": "Ice crystals"
					},
					{
						"tag": "Ice particles"
					},
					{
						"tag": "In situ atmospheric observations"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
