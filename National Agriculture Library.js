{
	"translatorID": "e391620a-0a33-415b-b08b-521fdbb2c257",
	"label": "National Agriculture Library",
	"creator": "Abe Jellinek",
	"target": "^https?://(pubag|naldc)\\.nal\\.usda\\.gov/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-08-11 22:01:59"
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


// This translator targets PubAg and NALDC, which are both Blacklight-based
// catalogs. It does not cover AGRICOLA, which runs Voyager 7 and is covered by
// that translator.

function detectWeb(doc, _url) {
	if (doc.querySelector('#document')) {
		return "journalArticle";
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('#documents h3 > a');
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

function scrape(doc, url) {
	let risURL = url.replace(/[#?].*$/, '').replace(/\/$/, '') + '.zotero';
	ZU.doGet(risURL, function (risText) {
		if (/^A4/m.test(risText)) {
			// PubAg puts the primary author in A1 and then *all* the authors,
			// including the primary author again, in A4
			risText = risText
				.replace(/^A1.+$/gm, '')
				.replace(/^A4/gm, 'A1');
		}
		
		// remove ca./b. dates from author names
		risText = risText.replace(/^(A[U1-4].\s*-\s*.*)(?:ca\.|b\.).*$/m, '$1');
		
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7"); // RIS
		translator.setString(risText);
		translator.setHandler("itemDone", function (obj, item) {
			if (url.includes('naldc.nal.usda.gov')) {
				item.libraryCatalog = 'National Agricultural Library Digital Collections';
			}
			else {
				item.libraryCatalog = 'PubAg';
				if (item.archiveLocation) {
					// like a PMID
					item.extra = (item.extra || '')
						+ `\nPubAg AGID: ${item.archiveLocation}`;
				}
			}
			
			let PMID = text(doc, 'a[href*="/pubmed/?term="] span');
			if (PMID) {
				item.extra = (item.extra || '') + `\nPMID: ${PMID}`;
			}
			let PMCID = text(doc, 'a[title*="Access PMCID"] span');
			if (PMCID) {
				item.extra = (item.extra || '') + `\nPMCID: ${PMCID}`;
			}
			
			if (!item.url) {
				let externalURL = attr(doc, '.external a', 'href');
				if (!externalURL.includes('doi.org')) { // not useful - already saving DOI
					item.url = externalURL;
				}
			}
			else if (item.url.includes('doi.org')) {
				delete item.url;
			}
			
			delete item.archive; // 'PubAg'
			delete item.archiveLocation; // AGID, etc.
			delete item.numPages; // volume/issue
			
			if (item.journalAbbreviation == item.publicationTitle) {
				delete item.journalAbbreviation;
			}
			
			if (item.volume) {
				item.volume = item.volume.replace('v.', '');
			}
			
			if (item.issue) {
				item.issue = item.issue.replace('no.', '');
			}
			
			if (item.pages) {
				item.pages = item.pages.replace(/pp?\./, '');
			}
			
			if (!item.ISSN) {
				item.ISSN = ZU.cleanISSN(attr(doc, 'meta[name="citation_issn"]', 'content'));
			}
			
			if (doc.querySelector('.pdf a')) {
				item.attachments.push({
					title: 'Full Text PDF',
					mimeType: 'application/pdf',
					url: attr(doc, '.pdf a', 'href')
				});
			}
			
			item.complete();
		});
		translator.translate();
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://pubag.nal.usda.gov/catalog/7284823",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "What Makes Bread and Durum Wheat Different?",
				"creators": [
					{
						"lastName": "Mastrangelo",
						"firstName": "Anna M.",
						"creatorType": "author"
					},
					{
						"lastName": "Cattivelli",
						"firstName": "Luigi",
						"creatorType": "author"
					}
				],
				"date": "2021-07",
				"DOI": "10.1016/j.tplants.2021.01.004",
				"ISSN": "1360-1385",
				"abstractNote": "Durum wheat (tetraploid) and bread wheat (hexaploid) are two closely related species with potentially different adaptation capacities and only a few distinct technological properties that make durum semolina and wheat flour more suitable for pasta, or bread and bakery products, respectively. Interspecific crosses and new breeding technologies now allow researchers to develop wheat lines with durum or bread quality features in either a tetraploid or hexaploid genetic background; such lines combine any technological properties of wheat with the different adaptation capacity expressed by tetraploid and hexaploid wheat genomes. Here, we discuss what makes bread and durum wheat different, consider their environmental adaptation capacity and the major quality-related genes that explain the different end-uses of semolina and bread flour and that could be targets for future wheat breeding programs.",
				"extra": "PubAg AGID: 7284823",
				"issue": "7",
				"libraryCatalog": "PubAg",
				"pages": "677-684",
				"publicationTitle": "Trends in plant science",
				"volume": "26",
				"attachments": [],
				"tags": [
					{
						"tag": "breadmaking quality"
					},
					{
						"tag": "breads"
					},
					{
						"tag": "durum wheat"
					},
					{
						"tag": "genetic background"
					},
					{
						"tag": "hexaploidy"
					},
					{
						"tag": "pasta"
					},
					{
						"tag": "semolina"
					},
					{
						"tag": "tetraploidy"
					},
					{
						"tag": "wheat flour"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://pubag.nal.usda.gov/catalog/7161673",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Predicting micronutrients of wheat using hyperspectral imaging",
				"creators": [
					{
						"lastName": "Hu",
						"firstName": "Naiyue",
						"creatorType": "author"
					},
					{
						"lastName": "Li",
						"firstName": "Wei",
						"creatorType": "author"
					},
					{
						"lastName": "Du",
						"firstName": "Chenghang",
						"creatorType": "author"
					},
					{
						"lastName": "Zhang",
						"firstName": "Zhen",
						"creatorType": "author"
					},
					{
						"lastName": "Gao",
						"firstName": "Yanmei",
						"creatorType": "author"
					},
					{
						"lastName": "Sun",
						"firstName": "Zhencai",
						"creatorType": "author"
					},
					{
						"lastName": "Yang",
						"firstName": "Li",
						"creatorType": "author"
					},
					{
						"lastName": "Yu",
						"firstName": "Kang",
						"creatorType": "author"
					},
					{
						"lastName": "Zhang",
						"firstName": "Yinghua",
						"creatorType": "author"
					},
					{
						"lastName": "Wang",
						"firstName": "Zhimin",
						"creatorType": "author"
					}
				],
				"date": "2021-05-01",
				"DOI": "10.1016/j.foodchem.2020.128473",
				"ISSN": "0308-8146",
				"abstractNote": "Micronutrients are the key factors to evaluate the nutritional quality of wheat. However, measuring micronutrients is time-consuming and expensive. In this study, the potential of hyperspectral imaging for predicting wheat micronutrient content was investigated. The spectral reflectance of wheat kernels and flour was acquired in the visible and near-infrared range (VIS-NIR, 375–1050 nm). Afterwards, wheat micronutrient contents were measured and their associations with the spectra were modeled. Results showed that the models based on the spectral reflectance of wheat kernel achieved good predictions for Ca, Mg, Mo and Zn (r²>0.70). The models based on the spectra reflectance of wheat flour showed good predictive capabilities for Mg, Mo and Zn (r²>0.60). The prediction accuracy was higher for wheat kernels than for the flour. This study showed the feasibility of hyperspectral imaging as a non-invasive, non-destructive tool to predict micronutrients of wheat.",
				"extra": "PubAg AGID: 7161673",
				"libraryCatalog": "PubAg",
				"pages": "2021 v.343",
				"publicationTitle": "Food chemistry",
				"volume": "343",
				"attachments": [],
				"tags": [
					{
						"tag": "accuracy"
					},
					{
						"tag": "food chemistry"
					},
					{
						"tag": "nutritive value"
					},
					{
						"tag": "prediction"
					},
					{
						"tag": "reflectance"
					},
					{
						"tag": "seeds"
					},
					{
						"tag": "wheat"
					},
					{
						"tag": "wheat flour"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://pubag.nal.usda.gov/catalog/6838747",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Staling kinetics of whole wheat pan bread",
				"creators": [
					{
						"lastName": "Sehn",
						"firstName": "Georgia Ane Raquel",
						"creatorType": "author"
					},
					{
						"lastName": "Steel",
						"firstName": "Caroline Joy",
						"creatorType": "author"
					}
				],
				"date": "2020-02",
				"DOI": "10.1007/s13197-019-04087-9",
				"ISSN": "0022-1155",
				"abstractNote": "Understanding the staling process of whole grain breads, especially in relation to the increase in firmness, can contribute to optimize the shelf life of these products. The aim of this work was to develop an equation (staling rate) capable of estimating the increase in firmness of whole wheat pan breads. The staling rate (K) demonstrated that the greater the bran content, the greater the increase in bread firmness (from 0.011 day⁻¹ for 0% replacement, to 0.174 day⁻¹ and 0.091 day⁻¹ for 30% replacement of fine and coarse bran, respectively). Thereby, we established an equation to estimate the firmness of whole wheat pan bread on a given day, considering the concentration of bran in the formulation, thus helping baking industries to predict bread behavior during storage and optimize the use of additives.",
				"extra": "PubAg AGID: 6838747\nPMID: 32116365\nPMCID: PMC7016051",
				"issue": "2",
				"libraryCatalog": "PubAg",
				"pages": "557-563",
				"publicationTitle": "Journal of food science and technology",
				"url": "http://ncbi.nlm.nih.gov/pmc/articles/PMC7016051",
				"volume": "57",
				"attachments": [],
				"tags": [
					{
						"tag": "additives"
					},
					{
						"tag": "baking"
					},
					{
						"tag": "bran"
					},
					{
						"tag": "breads"
					},
					{
						"tag": "equations"
					},
					{
						"tag": "firmness"
					},
					{
						"tag": "food spoilage"
					},
					{
						"tag": "industry"
					},
					{
						"tag": "shelf life"
					},
					{
						"tag": "wheat"
					},
					{
						"tag": "whole grain foods"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://pubag.nal.usda.gov/?q=soy&search_field=all_fields",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://naldc.nal.usda.gov/catalog/6964450",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Southern Plains Assessment of Vulnerability and Preliminary Adaptation and Mitigation Strategies for Farmers, Ranchers and Forest Land Owners",
				"creators": [
					{
						"lastName": "Jean Steiner",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"lastName": "Jeanne Schneider",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"lastName": "Clay Pope",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"lastName": "Sarah Pope",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"lastName": "Paulette Ford",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"lastName": "Rachel Steele",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "2015",
				"DOI": "10.32747/2015.6964450.ch",
				"abstractNote": "The Southern Plains region contributes significantly to the Nation’s wheat and beef production. Winter wheat is the principal annual crop, with much of it serving dual-use as a cool-season annual forage in addition to grain production. Cattle are raised on extensive pasture and rangelands across the region.",
				"language": "English",
				"libraryCatalog": "National Agricultural Library Digital Collections",
				"pages": "1 online resource (61 pages)",
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
		"url": "https://naldc.nal.usda.gov/catalog/7232772",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Heartwood taper in Northern Red Oak (Quercus rubra L.)",
				"creators": [
					{
						"lastName": "John P. Brown",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"lastName": "United States. Forest Service. Northern Research Station",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "2019",
				"abstractNote": "To better understand how the practice of long-term tree retention affects value, northern red oak (Quercus rubra L.) trees from the Menominee Indian Reservation in Wisconsin were harvested and examined for patterns of heartwood development in relation to several tree characteristics. A total of 69 mature northern red oak trees from three dbh size classes, small (34-47 cm, 20 trees), medium (48-60 cm, 20 trees), and large (>= 61 cm, 29 trees), were logged and optimally bucked. Cross-sectional disks were then removed from the tops of the stumps and each log and were analyzed for patterns of change in heartwood radius. Four factors were found to have a statistically significant effect on heartwood radius: age of the tree, size class, height, and inside bark radius. The inside bark radius was the strongest predictor of heartwood radius. A 1 cm increase in inside bark radius led to approximately a 0.95 cm increase in heartwood radius. Increasing height had a small negative effect, with heartwood radius decreasing approximately 0.05 cm for each meter above ground. Age of the tree had a small positive effect of 0.0016 cm per year and was only significant in one expert model considered. These results provide consumers of oak logs and forest managers insight to the interior heartwood pattern and can lead to improved value assessments for northern red oak logs.",
				"language": "English",
				"libraryCatalog": "National Agricultural Library Digital Collections",
				"pages": "1 online resource (9 pages) : one color illustration.-USDA",
				"url": "https://purl.fdlp.gov/GPO/gpo117952",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Dendrochronology"
					},
					{
						"tag": "Forest management"
					},
					{
						"tag": "Green tree retention"
					},
					{
						"tag": "Heartwood"
					},
					{
						"tag": "Quercus rubra"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://naldc.nal.usda.gov/?utf8=%E2%9C%93&search_field=all_fields&q=trees",
		"items": "multiple"
	}
]
/** END TEST CASES **/
