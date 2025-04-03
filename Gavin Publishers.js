{
	"translatorID": "7fb79c72-5c36-4abd-a5f5-02eac481ebf1",
	"label": "Gavin Publishers",
	"creator": "Mohd-PH",
	"target": "^https?://www\\.gavinpublishers\\.com/article/view/.*",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-02-23 20:24:07"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2023 Mohd-PH

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
	if (url.includes("article/view")) {
		return "journalArticle";
	}
	return false;
}

function getCreators(doc){
	return doc.querySelector('.main-container h3')
	.innerText
	.replace(/(\d|\*)/gi, '')
	.split(', ')
	.map(author => {
		return ZU.cleanAuthor(author, 'author')
	})
}

function getAbstract(doc){
	return [...doc.querySelectorAll('h4')].find(abstractElement => abstractElement.innerText == "Abstract").parentElement.innerText;
}

function getPublishedDate(doc){
	if(doc.querySelector('#border')){
		var datesElements = [...doc.querySelectorAll('#border p')];
	} else {
		var datesElements = [...doc.querySelectorAll('p.a')];
	}
	return ZU.strToISO(datesElements [datesElements .length - 1].childNodes[1].data);
}

function getDOI(doc){
	return doc.body.innerHTML.match(/href="https\:\/\/doi\.org\/([^"]*)"/i)[1]
}

function getPDFLink(doc){
	return [...doc.querySelectorAll('a')].find(a => a.innerText.match(/PDF Download/)).href ;
}

function doWeb(doc, url){
	var journalArticle = new Zotero.Item("journalArticle");
	journalArticle.title = doc.querySelector('h1.citation_title').innerText;
	journalArticle.publicationTitle= doc.querySelector('h1.citation_title').innerText;
	journalArticle.abstractNote = getAbstract(doc);
	journalArticle.accessDate =  ZU.strToISO(new Date().toDateString());
	journalArticle.creators = getCreators(doc);
	journalArticle.date = getPublishedDate(doc);
	journalArticle.DOI = getDOI(doc);
	journalArticle.journalAbbreviation = 'J Family Med Prim Care Open Acc';
	journalArticle.ISSN = "2688-7460";

	journalArticle.attachments = [];
	if(getPDFLink(doc)){
		journalArticle.attachments.push({
			title: "Full Text PDF",
			mimeType: "application/pdf",
			url: getPDFLink(doc)
		});
	}


	journalArticle.complete();

}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.gavinpublishers.com/article/view/prevalence-of-burnout-in-dementia-caregivers-riyadh-saudi-arabia",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Prevalence of Burnout in Dementia Caregivers, Riyadh, Saudi Arabia",
				"creators": [
					{
						"firstName": "Athir Athallah",
						"lastName": "Ahlruwaili",
						"creatorType": "author"
					},
					{
						"firstName": "Maryam",
						"lastName": "Chapra",
						"creatorType": "author"
					},
					{
						"firstName": "Mostafa",
						"lastName": "Kofi",
						"creatorType": "author"
					}
				],
				"date": "2022-07-13",
				"DOI": "10.29011/2688-7460.100092",
				"ISSN": "2688-7460",
				"abstractNote": "Abstract\n\nBackground: Dementia is a clinical syndrome caused by neurodegeneration. Because of the heterogeneity of clinical presentation and complexity of disease neuropathology, dementia classifications remain controversial. People with dementia generally require high levels of care, most of which is provided by informal or family caregivers. The number of caregivers has increased considerably. Burden of care in dementia represents a chief source of chronic stress to caregivers. Objective: The study aims to assess the prevalence of burnout among caregivers of the dementia patients and to identify the factors aggravating the burnout. Methodology: A cross sectional study was conducted in Riyadh Saudi Arabia. The study included 247 caregivers’ families of dementia patients in PSMMC Riyadh, Saudi Arabia. Data was collected by means of a predesigned questionnaire after insure good validity and reliability. Data were analyzed by using Statistical Package for Social Studies (SPSS 22; IBM Corp., New York, NY, USA). Results: A total of 247 patients were enrolled in the present study, of which more than half were male (58.20%),57.09% were in the age group of 50-60 years old, and the highest percentage (36.03%) were non-educated. The highest percentage of the participants was having anxiety, with a prevalence of 49.80%, with a mean (±SD) score of 9.82(±4.51) out of 21. While the prevalence of depression was 26.72%, with a mean (±SD) score of 8.16(±3.50) out of 21. There is a significant (P<0.05) association between anxiety and patient educational level, and marital status, where it was the highest with non-educated and married participants at 36.47% and 45.93%, respectively. While with caregivers' characteristics, anxiety was significantly (P>0.042) associated with the marital status, being the highest among married caregivers at 48.50%. Only marital status showed significant association with depression and the highest prevalence of depression was with married patients at 49.66%, with a P-value of 0.005. while when coming to the caregivers' characteristics, the prevalence of depression was significantly associated with their relationship with the patient and it was the highest among those with no relationship at 41.22%, caregiver income, being the lowest among those with the highest income at 11.49%, and clinical history of psychiatric illness and the prevalence of depression was higher among those without at 70.34%, with all p-values <0.05. Conclusion: The prevalence of anxiety among caregivers of dementia patients was 49.80%, while the prevalence of depression was 26.72%. Low educational level and a history of psychiatric illness or taking antipsychotic medications were significant risk factors for anxiety in the current study.\n\nKeywords: Dementia; Caregiver; Psychology; Burnout; Depression; Anxiety",
				"journalAbbreviation": "J Family Med Prim Care Open Acc",
				"libraryCatalog": "Gavin Publishers",
				"publicationTitle": "Prevalence of Burnout in Dementia Caregivers, Riyadh, Saudi Arabia",
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
		"url": "https://www.gavinpublishers.com/article/view/frax-in-hemodialysis-with-osteoporosis--a-registry-study",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "FRAX® in Hemodialysis with Osteoporosis- A Registry Study",
				"creators": [
					{
						"firstName": "Wei-Cheng",
						"lastName": "Huang",
						"creatorType": "author"
					},
					{
						"firstName": "Yu-Wei",
						"lastName": "Wang",
						"creatorType": "author"
					},
					{
						"firstName": "Chao-Tung",
						"lastName": "Chen",
						"creatorType": "author"
					},
					{
						"firstName": "Ying-Chou",
						"lastName": "Chen",
						"creatorType": "author"
					}
				],
				"date": "2023-01-13",
				"DOI": "10.29011/2688-7460.100210",
				"ISSN": "2688-7460",
				"abstractNote": "Abstract\n\nObjectives: The best way to find out which hemodialysis patients are at high fracture risk is uncertain. The primary purpose of this study was to analyze the use of the Fracture Risk Assessment Tool (FRAX®) in hemodialysis subjects. Methods: Participants were recruited by the nephrology and family department. Each participant was to complete the structured questionnaire, which included the clinical risk factors specifically for the FRAX® calculation tool. Results: A total of 450 patients were enrolled. The age of the patients was 64 years (IQR, 58-70). Most of the patients were female (74.7%). The duration of hemodialysis was 3 years (IQR, 2-5).There was high correlation found between the 10-yr major osteoporotic fracture probabilities calculated with and without Bone Mineral Density (BMD) (p < 0.001). There was also correlation in terms of hip fractures risk. When we divided the patients into normal femoral neck BMD, osteopenia, and osteoporosis, there is still high correlation between those with and without BMD. 12.7% with BMD and 7.3% without BMD were above treatment threshold by major osteoporotic fracture risk, while 48.0% with BMD and 33.3% without BMD were above treatment threshold by hip fracture risk. Conclusions: FRAX is valuable in assess fracture risk in hemodialysis patients. FRAX® with and without BMD had high correlation with each other in hemodialysis patients. FRAX-based intervention thresholds are helpful for health economic assessment and to avoid unnecessary treatment.\n\nKeywords: FRAX®; Hemodialysis; Osteoporosis; Bone mineral density",
				"journalAbbreviation": "J Family Med Prim Care Open Acc",
				"libraryCatalog": "Gavin Publishers",
				"publicationTitle": "FRAX® in Hemodialysis with Osteoporosis- A Registry Study",
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
		"url": "https://www.gavinpublishers.com/article/view/challenges-in-the-use-of-m-chat-as-screening-tool-for-early-detection-of-autism-in-primary-care-centers-riyadh-saudi-arabia",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Challenges in the Use of M-chat as Screening Tool for Early Detection of Autism in Primary Care Centers, Riyadh, Saudi Arabia",
				"creators": [
					{
						"firstName": "Authors: Nadeer H. Al",
						"lastName": "Khadhrawi",
						"creatorType": "author"
					},
					{
						"firstName": "Fawzyia",
						"lastName": "Altassan",
						"creatorType": "author"
					},
					{
						"firstName": "Mohamed Zaki",
						"lastName": "Al-Baik",
						"creatorType": "author"
					},
					{
						"firstName": "Mostafa",
						"lastName": "Kofi",
						"creatorType": "author"
					}
				],
				"date": "2022-04-08",
				"DOI": "10.29011/2688-7460.100077",
				"ISSN": "2688-7460",
				"abstractNote": "Abstract\n\nIntroduction: M-chat is a screening tool for autism among children. This study describes use of M-chat and challenges on its application in our local community primary health care centers. This study aimed to test applicability and challenges in use of M-Chat screening method to identify possible autistic children. Study Design: cross sectional descriptive. Methods: 2542 children were screened using the M-Chat tool for early detection of ASD. Results: 222/2542 children were proved that they need further assessment since they were suspected to be ASD. 2542 children were screened for ASD, 222 children were diagnosed as possible ASD, 103/222 were females and 119/222 were males’ children. Only one child scored a score of 2, 115 children scored a score of 3, 40 children scored 4, 19 children scored 5, 13 children scored 6, and 8 children scored 7, while 13 children scored 8 to 15. Conclusion: The M-Chat was able to detect 222 out of 2452 to be possible ASD, these are important findings, since early detection and intervention have a great impact in the improvement and outcomes of the ASD children.\n\nKeywords: Autism; M-Chat; Screening",
				"journalAbbreviation": "J Family Med Prim Care Open Acc",
				"libraryCatalog": "Gavin Publishers",
				"publicationTitle": "Challenges in the Use of M-chat as Screening Tool for Early Detection of Autism in Primary Care Centers, Riyadh, Saudi Arabia",
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
