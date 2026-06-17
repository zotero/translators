{
	"translatorID": "b2285ec2-e454-49dc-b9ce-115035b55325",
	"label": "Ovid OCE",
	"creator": "Abe Jellinek",
	"target": "^https://oce\\.ovid\\.com/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-09-03 16:42:47"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2025 Abe Jellinek

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


let token = null;

function detectWeb(doc, url) {
	if (getID(url)) {
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
	var rows = doc.querySelectorAll('.searchResultTitle a.title');
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
			await scrape(getID(url));
		}
	}
	else {
		await scrape(getID(url));
	}
}

async function scrape(id) {
	if (!token) token = await getToken();

	id = await requestText(`/article/MapToWkmrid?an=${encodeURIComponent(id)}`);
	
	let json = await requestJSON(`https://assets.ovid.com/public/metadata/${id}/t/skinny-json?${token}`);
	scrapeJSON(json);
}

// The site's frontend renders easy-to-parse HTML, but we can't use that for multiples
// (or on the server). Parse the rather annoying JSON instead.
function scrapeJSON(json) {
	let { article: root } = json;
	let article = findKey(root.metadataList, 'article');
	let issue = findKey(root.metadataList, 'issue');
	let journal = findKey(root.metadataList, 'journal');

	let item = new Zotero.Item('journalArticle');

	item.title = extract(findKey(article.titleList, 'title'));
	item.abstractNote = extract(findKey(article.captionList, 'abstract'));
	item.publicationTitle = extract(findKey(journal.titleList, 'title'));
	item.volume = extract(findKey(issue.taxonomyIdentifierList, 'volume'));
	item.issue = extract(findKey(issue.taxonomyIdentifierList, 'issue-number'));

	let pageRange = findKey(article.pagination?.pageRangeList, 'pageRange');
	if (pageRange) {
		item.pages = `${extract(pageRange.firstPage)}-${extract(pageRange.lastPage)}`
			.replace(/-$/, '');
	}

	item.date = findKey(article.publicationHistoryList, 'publicationHistory')
		?.publicationDate
		?.sortedValue;
	item.DOI = ZU.cleanDOI(extract(findKey(article.externalIdentifierList, 'doi')));
	item.ISSN = ZU.cleanISSN(extract(findKey(journal.externalIdentifierList, 'p-issn')));

	let authors = findKeys(article.contributorList, 'author');
	for (let author of authors) {
		let name = findKey(author.nameList, 'name');
		item.creators.push({
			firstName: extract(name.firstName),
			lastName: extract(name.lastName),
			creatorType: 'author',
		});
	}

	let pdfID = findKeys(root.assetInformation.representationList, 'representation')
		.find(repr => repr.wkmrid.includes('pdf'))
		?.wkmrid;
	if (pdfID) {
		let pdfURL = `https://assets.ovid.com/${pdfID}?${token}`;
		item.attachments.push({
			title: 'Full Text PDF',
			url: pdfURL,
			mimeType: 'application/pdf'
		});
	}

	let id = extract(findKey(article.externalIdentifierList, 'accession-number'));
	if (id) {
		item.url = `https://oce.ovid.com/article/${id}`;
	}

	item.complete();
}

function findKey(array, key) {
	return array?.find(o => key in o)?.[key];
}

function findKeys(array, key) {
	return array?.filter(o => key in o).map(o => o[key]) ?? [];
}

function extract(obj) {
	if (!obj) return '';

	let format = obj.format;

	if (!format && obj.nodeName) {
		if (obj.fullText) {
			format = 'full-text';
		}
		else if (obj.plainText) {
			format = 'plain-text';
		}
	}

	switch (format) {
		case 'full-text':
			return obj.fullText.map(node => extract(node)).filter(Boolean).join('\n\n');

		case 'plain-text':
			return obj.plainText;
		
		default:
			return '';
	}
}

function getID(url) {
	return url.match(/\/article\/([^#?/]+)/)?.[1];
}

async function getToken() {
	let { token } = await requestJSON('/token/public');
	return token;
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://oce.ovid.com/article/00041444-990000000-00052",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Comparison of microRNA expression levels in patients with schizophrenia before and after electroconvulsive therapy",
				"creators": [
					{
						"firstName": "Nazife Gamze",
						"lastName": "Usta Saglam",
						"creatorType": "author"
					},
					{
						"firstName": "Mehmet Bugrahan",
						"lastName": "Duz",
						"creatorType": "author"
					},
					{
						"firstName": "Seda",
						"lastName": "Salman Yilmaz",
						"creatorType": "author"
					},
					{
						"firstName": "Mustafa",
						"lastName": "Ozen",
						"creatorType": "author"
					},
					{
						"firstName": "Ibrahim",
						"lastName": "Balcioglu",
						"creatorType": "author"
					}
				],
				"date": "2024-05-29",
				"DOI": "10.1097/YPG.0000000000000371",
				"ISSN": "0955-8829",
				"abstractNote": "Exploring the role of microRNAs in the antipsychotic efficacy of electroconvulsive therapy (ECT) will contribute to understanding the underlying mechanism through which ECT exerts its therapeutic effects. The primary objective of this study was to identify microRNA alterations before and after ECT in patients with schizophrenia. We compared microarray-based microRNA profiles in peripheral blood from eight patients with schizophrenia before and after ECT and eight healthy controls. Then, we aimed to validate selected differentially expressed microRNAs in 30 patients with schizophrenia following a course of ECT, alongside 30 healthy controls by using quantitative real-time PCR (qRT-PCR). Microarray-based expression profiling revealed alterations in 681 microRNAs when comparing pre- and post-ECT samples. Subsequent qRT-PCR analysis of the selected microRNAs (miR-20a-5p and miR-598) did not reveal any statistical differences between pre- and post-ECT samples nor between pre-ECT samples and those of healthy controls. As neuroepigenetic studies on ECT are still in their infancy, the results reported in this study are best interpreted as exploratory outcomes. Additional studies are required to explore the potential epigenetic mechanisms underlying the therapeutic efficacy of ECT.",
				"libraryCatalog": "Ovid OCE",
				"publicationTitle": "Psychiatric Genetics",
				"url": "https://oce.ovid.com/article/00041444-990000000-00052",
				"volume": "Publish Ahead of Print",
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
		"url": "https://oce.ovid.com/article/00006565-202411000-00011",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Decreasing Invasive Urinary Tract Infection Screening in a Pediatric Emergency Department to Improve Quality of Care",
				"creators": [
					{
						"firstName": "Felicia",
						"lastName": "Paluck",
						"creatorType": "author"
					},
					{
						"firstName": "Inbal",
						"lastName": "Kestenbom",
						"creatorType": "author"
					},
					{
						"firstName": "Gidon",
						"lastName": "Test",
						"creatorType": "author"
					},
					{
						"firstName": "Emma",
						"lastName": "Carscadden",
						"creatorType": "author"
					},
					{
						"firstName": "Olivia",
						"lastName": "Ostrow",
						"creatorType": "author"
					}
				],
				"date": "2024-11-01",
				"DOI": "10.1097/PEC.0000000000003228",
				"ISSN": "0749-5161",
				"abstractNote": "Objectives\n\nObtaining urine samples in younger children undergoing urinary tract infection (UTI) screening can be challenging in busy emergency departments (EDs), and sterile techniques, like catheterization, are invasive, traumatizing, and time consuming to complete. Noninvasive techniques have been shown to reduce catheterization rates but are variably implemented. Our aim was to implement a standardized urine bag UTI screening approach in febrile children aged 6 to 24 months to decrease the number of unnecessary catheterizations by 50% without impacting ED length of stay (LOS) or return visits (RVs).\n\nMethods\n\nAfter forming an interprofessional study team and engaging key stakeholders, a multipronged intervention strategy was developed using the Model for Improvement. A urine bag screening pathway was created and implemented using Plan, Do, Study Act (PDSA) cycles for children aged 6 to 24 months being evaluated for UTIs. A urine bag sample with point-of-care (POC) urinalysis (UA) was integrated as a screening approach. The outcome measure was the rate of ED urine catheterizations, and balancing measures included ED LOS and RVs. Statistical process control methods were used for analysis.\n\nResults\n\nDuring the 3-year study period from January 2019 to June 2022, the ED catheterization rate successfully decreased from a baseline of 73.3% to 37.7% and was sustained for approximately 2 years. Unnecessary urine cultures requiring microbiology processing decreased from 79.8% to 40.7%. The ED LOS initially decreased; however, it increased by 17 minutes during the last 8 months of the study. There was no change in RVs.\n\nConclusion\n\nA urine bag screening pathway was successfully implemented to decrease unnecessary, invasive catheterizations for UTI screening in children with only a slight increase in ED LOS. In addition to the urine bag pathway, an ED nursing champion, strategic alignment, and broad provider engagement were all instrumental in the initiative's success.",
				"issue": "11",
				"libraryCatalog": "Ovid OCE",
				"pages": "812-817",
				"publicationTitle": "Pediatric Emergency Care",
				"url": "https://oce.ovid.com/article/00006565-202411000-00011",
				"volume": "40",
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
		"url": "https://oce.ovid.com/article/00006114-202408270-00038",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Antibodies in Autoimmune Neuropathies",
				"creators": [
					{
						"firstName": "Elba",
						"lastName": "Pascual-Goñi",
						"creatorType": "author"
					},
					{
						"firstName": "Marta",
						"lastName": "Caballero-Ávila",
						"creatorType": "author"
					},
					{
						"firstName": "Luis",
						"lastName": "Querol",
						"creatorType": "author"
					}
				],
				"date": "2024-08-27",
				"DOI": "10.1212/WNL.0000000000209725",
				"ISSN": "0028-3878",
				"abstractNote": "Autoimmune neuropathies are a heterogeneous group of immune-mediated disorders of the peripheral nerves. Guillain-Barré syndrome (GBS) and chronic inflammatory demyelinating polyradiculoneuropathy (CIDP) are the archetypal acute and chronic forms. Over the past few decades, pathogenic antibodies targeting antigens of the peripheral nervous system and driving peripheral nerve damage in selected patients have been described. Moreover, the detection of these antibodies has diagnostic and therapeutic implications that have prompted a modification of the GBS and CIDP diagnostic algorithms. GBS diagnosis is based in clinical criteria, and systematic testing of anti-ganglioside antibodies is not required. Nonetheless, a positive anti-ganglioside antibody test may support the clinical suspicion when diagnosis of GBS (GM1 IgG), Miller Fisher (GQ1b IgG), or acute sensory-ataxic (GD1b IgG) syndromes is uncertain. Anti–myelin-associated glycoprotein (MAG) IgM and anti-disialosyl IgM antibodies are key in the diagnosis of anti-MAG neuropathy and chronic ataxic neuropathy, ophthalmoplegia, M-protein, cold agglutinins, and disialosyl antibodies spectrum neuropathies, respectively, and help differentiating these conditions from CIDP. Recently, the field has been boosted by the discovery of pathogenic antibodies targeting proteins of the node of Ranvier contactin-1, contactin-associated protein 1, and nodal and paranodal isoforms of neurofascin (NF140, NF186, or NF155). These antibodies define subgroups of patients with specific clinical (most importantly poor or partial response to conventional therapies and excellent response to anti-CD20 therapy) and pathologic (node of Ranvier disruption in the absence of inflammation) features that led to the definition of the “autoimmune nodopathy” diagnostic category and to the incorporation of nodal/paranodal antibodies to clinical routine testing. The purpose of this review was to provide a practical vision for the general neurologist of the use of antibodies in the clinical assessment of autoimmune neuropathies.",
				"issue": "4",
				"libraryCatalog": "Ovid OCE",
				"publicationTitle": "Neurology",
				"url": "https://oce.ovid.com/article/00006114-202408270-00038",
				"volume": "103",
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
		"url": "https://oce.ovid.com/search?q=test",
		"defer": true,
		"items": "multiple"
	}
]
/** END TEST CASES **/
