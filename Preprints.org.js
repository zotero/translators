{
	"translatorID": "88473358-39ab-4d08-9873-1ad72cc626c7",
	"label": "Preprints.org",
	"creator": "Abe Jellinek",
	"target": "^https://www\\.preprints\\.org/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-08-23 07:21:42"
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


let preprintType = ZU.fieldIsValidForType('title', 'preprint')
	? 'preprint'
	: 'manuscript';

function detectWeb(doc, url) {
	if (url.includes('/manuscript/')) {
		if (doc.querySelector('.peer-reviewed-box')) {
			return 'journalArticle';
		}
		else {
			return preprintType;
		}
	}
	else if (getSearchResults(doc, true)) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.row a.title[href*="/manuscript/"]');
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
		if (!items) return;
		for (let url of Object.keys(items)) {
			await scrape(await requestDocument(url));
		}
	}
	else {
		await scrape(doc, url);
	}
}

async function scrape(doc, url) {
	if (doc.querySelector('.peer-reviewed-box')) {
		let doiNode = doc.querySelector('.peer-reviewed-box .journal-ref');
		if (doiNode) {
			let DOI = doiNode.lastChild.nodeValue;
			if (DOI) DOI = ZU.cleanDOI(DOI);
			if (DOI) {
				await scrapeDOI(DOI);
			}
		}
		else {
			await scrapePublisher(attr(doc, '.peer-reviewed-box a', 'href'));
		}
	}
	else {
		await scrapeEM(doc, url);
	}
}

async function scrapeDOI(DOI) {
	let translator = Zotero.loadTranslator('search');
	translator.setSearch({ DOI });
	translator.setHandler('translators', (_, translators) => {
		translator.setTranslator(translators);
	});
	await translator.getTranslators();
	await translator.translate();
}

// Just a failsafe in case there's no DOI
async function scrapePublisher(url) {
	let doc = await requestDocument(url);
	let translator = Zotero.loadTranslator('web');
	translator.setDocument(doc);
	translator.setHandler('translators', (_, translators) => {
		translator.setTranslator(translators);
	});
	await translator.getTranslators();
	await translator.translate();
}

async function scrapeEM(doc, url = doc.location.href) {
	let translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	
	translator.setHandler('itemDone', (_obj, item) => {
		item.attachments = item.attachments.filter(a => a.title != 'Snapshot');
		item.libraryCatalog = 'Preprints.org';
		try {
			item.archiveID = url.match(/\/manuscript\/([^/?#]+)/)[1].replace('.', '');
		}
		catch (e) {}
		item.complete();
	});

	let em = await translator.getTranslatorObject();
	em.itemType = preprintType;
	await em.doWeb(doc, url);
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.preprints.org/manuscript/201805.0444/v1",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Encapsulation of Droplets Using Cusp Formation behind a Drop Rising in a Non-Newtonian Fluid",
				"creators": [
					{
						"creatorType": "author",
						"firstName": "Raphaël",
						"lastName": "Poryles"
					},
					{
						"creatorType": "author",
						"firstName": "Roberto",
						"lastName": "Zenit"
					}
				],
				"date": "2018-08-01",
				"DOI": "10.3390/fluids3030054",
				"ISSN": "2311-5521",
				"abstractNote": "The rising of a Newtonian oil drop in a non-Newtonian viscous solution is studied experimentally. In this case, the shape of the ascending drop is strongly affected by the viscoelastic and shear-thinning properties of the surrounding liquid. We found that the so-called velocity discontinuity phenomena is observed for drops larger than a certain critical size. Beyond the critical velocity, the formation of a long tail is observed, from which small droplets are continuously emitted. We determined that the fragmentation of the tail results mainly from the effect of capillary effects. We explore the idea of using this configuration as a new encapsulation technique, where the size and frequency of droplets are directly related to the volume of the main rising drop, for the particular pair of fluids used. These experimental results could lead to other investigations, which could help to predict the droplet formation process by tuning the two fluids’ properties, and adjusting only the volume of the main drop.",
				"issue": "3",
				"journalAbbreviation": "Fluids",
				"language": "en",
				"libraryCatalog": "DOI.org (Crossref)",
				"pages": "54",
				"publicationTitle": "Fluids",
				"url": "http://www.mdpi.com/2311-5521/3/3/54",
				"volume": "3",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.preprints.org/manuscript/202202.0276/v1",
		"items": [
			{
				"itemType": "preprint",
				"title": "Presence of Crystals in the Synovial Fluid of Patients With Psoriatic Arthritis",
				"creators": [
					{
						"firstName": "Stanislava Dimitrova",
						"lastName": "Popova-Belova",
						"creatorType": "author"
					},
					{
						"firstName": "Mariela Gencheva",
						"lastName": "Geneva-Popova",
						"creatorType": "author"
					},
					{
						"firstName": "Velichka Zaharieva",
						"lastName": "Popova",
						"creatorType": "author"
					},
					{
						"firstName": "Krasimir Iliev",
						"lastName": "Kraev",
						"creatorType": "author"
					},
					{
						"firstName": "Anastas Zgurov",
						"lastName": "Batalov",
						"creatorType": "author"
					}
				],
				"date": "2022-02-22",
				"DOI": "10.20944/preprints202202.0276.v1",
				"abstractNote": "Analyzing synovial fluid from joints affected by the pathological process of psoriatic arthritis is part of the overall patient examination, since it may have differential diagnostic significance. The purpose of this study was to assess the presence of crystals in the synovial fluid of psoriatic arthritis patients as biomarkers for disease activity. Materials and methods: The synovial fluid of 156 patients with proven PSA diagnosis (patients covered CASPAR criteria) was analyzed over 24 months and compared to 50 patients with activated gonarthrosis. The Leica DM4500P polarization microscope (Leica Microsystems, Germany) was used for crystal detection. Pain and disease activity measures were also evaluated (PSA VAS for pain, DAPSA, PASDAI, mCPDAI, and HAQ-DI). The statistical analysis was carried out using SPSS version 26 with a significance set at p &lt; 0.05. Results: The macroscopic appearance of synovial fluid from patients with psoriatic arthritis was clear in 84.6% of the patients. Synovial fluid crystals were found in 23.71% of patients with psoriatic arthritis - predominantly monosodium urate (67.58%) but also calcium pyrophosphate (21.62%) and lipid drops (5.4%). The presence of monosodium urate crystals significantly correlates with all pain and disease activity measures &ndash; VAS for pain, DAPSA, PASDAI, mCPDAI, and HAQ-DI. In 67.56% of patients with established crystals treatment with an anti-TNF blocker was started at the discretion of the treating rheumatologist due to high levels of disease activity. Conclusion: Examining the synovial fluid in PSA patients is a necessary minimally invasive procedure in cases of joint effusion, since the presence of synovial fluid crystals is a significant indicator of disease severity. The current analyses demonstrate that the presence of synovial fluid crystals in PSA patients can be used as a biomarker for disease severity and the necessity to commence biological treatment (most often TNF-a-blocker).",
				"archiveID": "2022020276",
				"language": "en",
				"libraryCatalog": "Preprints.org",
				"repository": "Preprints",
				"url": "https://www.preprints.org/manuscript/202202.0276/v1",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "PSA"
					},
					{
						"tag": "biomarker"
					},
					{
						"tag": "crystals"
					},
					{
						"tag": "synovial fluid"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.preprints.org/manuscript/201810.0525/v2",
		"items": [
			{
				"itemType": "preprint",
				"title": "Scaling Law for Liquid Splashing inside a Container Drop Impact on a Solid Surface",
				"creators": [
					{
						"firstName": "Bohua",
						"lastName": "Sun",
						"creatorType": "author"
					}
				],
				"date": "2018-11-15",
				"DOI": "10.20944/preprints201810.0525.v2",
				"abstractNote": "This letter attempts to find splashing height of liquid-filled container drop impact to a solid surface by dimensional analysis (DA). Two solutions were obtained by both traditional DA and directed DA without solving any governing equations. It is found that the directed DA can provide much more useful information than the traditional one. This study shows that the central controlling parameter is called splash number $\\mathrm{Sp}=\\mathrm{Ga} \\mathrm{La}^\\beta=(\\frac{gR^3}{\\nu^2})(\\frac{\\sigma R}{\\rho \\nu^2})^\\beta$, which is the collective performance of each quantity. The splash height is given by $ \\frac{h}{H}=(\\frac{\\rho\\nu^2}{\\sigma R})^\\alpha f[\\frac{gR^3}{\\nu^2}(\\frac{R\\sigma}{\\rho\\nu^2})^\\beta]=\\frac{1}{\\mathrm{La}^\\alpha}f(\\mathrm{Ga}\\cdot \\mathrm{La}^\\beta)$. From the physics of the splashing number, we can have a fair good picture on the physics of the liquid splashing as follows: the jets propagation will generate vortex streets from the container bottom due to sudden pressure increasing from drop impact (water-hammer effect), which will travel along the container sidewall to the centre of the container and subsequently excite a gravity wave on the liquid surface. The interaction between the gravitational force, surface force and viscous force is responsible for creating droplet splash at the liquid surface.",
				"archiveID": "2018100525",
				"language": "en",
				"libraryCatalog": "Preprints.org",
				"repository": "Preprints",
				"url": "https://www.preprints.org/manuscript/201810.0525/v2",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "dimensional analysis"
					},
					{
						"tag": "directed dimensional analysis"
					},
					{
						"tag": "liquid splashing"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.preprints.org/search?search1=fluid&field1=title_keywords&search2=fluid&field2=assigned_doi&clause=OR",
		"items": "multiple"
	}
]
/** END TEST CASES **/
