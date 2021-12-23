{
	"translatorID": "f36025f5-597e-4873-841c-f5c877a05b9b",
	"label": "F1000 Research",
	"creator": "Abe Jellinek",
	"target": "^https?://(www\\.)?(((openresearchcentral|(aas|amrc|hrb|wellcome|gates)openresearch)\\.org)|(f1000research|emeraldopenresearch)\\.com)/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 200,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-08-16 20:40:08"
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


// we should also support open-research-europe.ec.europa.eu, but it uses a
// version of the platform without any EM metadata and an obfuscated citation
// export mechanism...


function detectWeb(doc, url) {
	if (url.includes('/articles/')
		&& doc.querySelector('meta[name="citation_title"]')) {
		return "report";
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.article-listing .article-link');
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
	var translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	
	translator.setHandler('itemDone', function (obj, item) {
		item.itemType = 'report';
		item.extra = (item.extra || '') + '\nType: article'; // preprint
		
		delete item.pages;
		delete item.reportType;
		
		item.reportNumber = `${item.volume}:${item.issue}`;
		delete item.volume;
		delete item.issue;
		delete item.number;
		
		item.institution = item.publicationTitle;
		delete item.publisher;
		delete item.publicationTitle;
		
		if (item.date) {
			item.date = ZU.strToISO(item.date);
		}
		
		item.attachments = item.attachments.filter(at => at.title != 'Snapshot');
		
		item.complete();
	});

	translator.getTranslatorObject(function (trans) {
		trans.itemType = "report";
		trans.doWeb(doc, url);
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://f1000research.com/articles/10-614",
		"items": [
			{
				"itemType": "report",
				"title": "Cerebrospinal fluid neurofilament light levels in CLN2 disease patients treated with enzyme replacement therapy normalise after two years on treatment",
				"creators": [
					{
						"firstName": "Katharina",
						"lastName": "Iwan",
						"creatorType": "author"
					},
					{
						"firstName": "Nina",
						"lastName": "Patel",
						"creatorType": "author"
					},
					{
						"firstName": "Amanda",
						"lastName": "Heslegrave",
						"creatorType": "author"
					},
					{
						"firstName": "Mina",
						"lastName": "Borisova",
						"creatorType": "author"
					},
					{
						"firstName": "Laura",
						"lastName": "Lee",
						"creatorType": "author"
					},
					{
						"firstName": "Rebecca",
						"lastName": "Bower",
						"creatorType": "author"
					},
					{
						"firstName": "Sara E.",
						"lastName": "Mole",
						"creatorType": "author"
					},
					{
						"firstName": "Philippa B.",
						"lastName": "Mills",
						"creatorType": "author"
					},
					{
						"firstName": "Henrik",
						"lastName": "Zetterberg",
						"creatorType": "author"
					},
					{
						"firstName": "Kevin",
						"lastName": "Mills",
						"creatorType": "author"
					},
					{
						"firstName": "Paul",
						"lastName": "Gissen",
						"creatorType": "author"
					},
					{
						"firstName": "Wendy E.",
						"lastName": "Heywood",
						"creatorType": "author"
					}
				],
				"date": "2021-07-20",
				"abstractNote": "Classic late infantile neuronal ceroid lipofuscinosis (CLN2 disease) is caused by a deficiency of tripeptidyl-peptidase-1. In 2017, the first CLN2 enzyme replacement therapy (ERT) cerliponase alfa (Brineura) was approved by the FDA and EMA. The CLN2 disease clinical rating scale (CLN2 CRS) was developed to monitor loss of motor function, language and vision as well as frequency of generalised tonic clonic seizures. Using CLN2 CRS in an open label clinical trial it was shown that Brineura slowed down the progression of CLN2 symptoms. Neurofilament light chain (NfL) is a protein highly expressed in myelinated axons. An increase of cerebrospinal fluid (CSF) and blood NfL is found in a variety of neuroinflammatory, neurodegenerative, traumatic, and cerebrovascular diseases. We analysed CSF NfL in CLN2 patients treated with Brineura to establish whether it can be used as a possible biomarker of response to therapy. Newly diagnosed patients had CSF samples collected and analysed at first treatment dose and up to 12 weeks post-treatment to look at acute changes. Patients on a compassionate use programme who were already receiving ERT for approximately 1yr had CSF samples collected and NfL analysed over the following 1.3 years (2.3 years post-initiation of ERT) to look at long-term changes. All newly diagnosed patients we investigated with classical late infantile phenotype had high NfL levels &gt;2000 pg/ml at start of treatment. No significant change was observed in NfL up to 12 weeks post-treatment. After one year of ERT, two out of six patients still had high NfL levels, but all patients showed a continued decrease, and all had low NfL levels after two years on ERT. NfL levels appear to correspond and predict improved clinical status of patients on ERT and could be useful as a biomarker to monitor neurodegeneration and verify disease modification in CLN2 patients on ERT.",
				"extra": "Type: article",
				"institution": "F1000Research",
				"language": "en",
				"libraryCatalog": "f1000research.com",
				"reportNumber": "10:614",
				"rights": "http://creativecommons.org/licenses/by/4.0/",
				"url": "https://f1000research.com/articles/10-614",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Enzyme replacment therapy"
					},
					{
						"tag": "Neurofilament light"
					},
					{
						"tag": "Neuronal Ceroid lipofuscinosis"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://f1000research.com/articles/10-153",
		"items": [
			{
				"itemType": "report",
				"title": "Regional disparities in postnatal care among mothers aged 15-49 years old: An analysis of the Indonesian Demographic and Health Survey 2017",
				"creators": [
					{
						"firstName": "Mochammad Nur",
						"lastName": "Cahyono",
						"creatorType": "author"
					},
					{
						"firstName": "Ferry",
						"lastName": "Efendi",
						"creatorType": "author"
					},
					{
						"firstName": "Harmayetty",
						"lastName": "Harmayetty",
						"creatorType": "author"
					},
					{
						"firstName": "Qorinah Estiningtyas Sakilah",
						"lastName": "Adnani",
						"creatorType": "author"
					},
					{
						"firstName": "Hsiao Ying",
						"lastName": "Hung",
						"creatorType": "author"
					}
				],
				"date": "2021-08-16",
				"abstractNote": "Background: In Indonesia, maternal mortality remains high, significantly 61.59% occur in the postnatal period. Postnatal care (PNC) provision is a critical intervention between six hours and 42 days after childbirth and is the primary strategy to reduce maternal mortality rates. However, underutilisation of PNC in Indonesia still remains high, and limited studies have shown the regional disparities of PNC in Indonesia. Methods: This study aims to explore the gaps between regions in PNC service for mothers who have had live births during the last five years in Indonesia. This study was a secondary data analysis study using the Indonesian Demographic and Health Survey (IDHS) in 2017. A total of 13,901 mothers aged 15-49 years having had live births within five years were included. Chi-squared test and binary logistic regression were performed to determine regional disparities in PNC. Results: Results indicated that the prevalence of PNC service utilisation among mothers aged 15-49 years was 70.94%. However, regional gaps in the utilisation of PNC service were indicated. Mothers in the Central of Indonesia have used PNC services 2.54 times compared to mothers in the Eastern of Indonesia (OR = 2.54; 95% CI = 1.77-3.65, p&lt;0.001). Apart from the region, other variables have a positive relationship with PNC service, including wealth quintile, accessibility health facilities, age of children, childbirth order, mother's education, maternal occupation, spouse's age, and spouse's education. Conclusion: The results suggest the need for national policy focuses on service equality, accessible, and reliable implementation to improve postnatal care utilisation among mothers to achieve the maximum results for the Indonesian Universal Health Coverage plan.",
				"extra": "Type: article",
				"institution": "F1000Research",
				"language": "en",
				"libraryCatalog": "f1000research.com",
				"reportNumber": "10:153",
				"rights": "http://creativecommons.org/licenses/by/4.0/",
				"shortTitle": "Regional disparities in postnatal care among mothers aged 15-49 years old",
				"url": "https://f1000research.com/articles/10-153",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "postnatal care"
					},
					{
						"tag": "reduced inequalities"
					},
					{
						"tag": "regional disparities"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://wellcomeopenresearch.org/articles/6-209",
		"items": [
			{
				"itemType": "report",
				"title": "Methodology of Natsal-COVID Wave 1: a large, quasi-representative survey with qualitative follow-up measuring the impact of COVID-19 on sexual and reproductive health in Britain",
				"creators": [
					{
						"firstName": "Emily",
						"lastName": "Dema",
						"creatorType": "author"
					},
					{
						"firstName": "Andrew J.",
						"lastName": "Copas",
						"creatorType": "author"
					},
					{
						"firstName": "Soazig",
						"lastName": "Clifton",
						"creatorType": "author"
					},
					{
						"firstName": "Anne",
						"lastName": "Conolly",
						"creatorType": "author"
					},
					{
						"firstName": "Margaret",
						"lastName": "Blake",
						"creatorType": "author"
					},
					{
						"firstName": "Julie",
						"lastName": "Riddell",
						"creatorType": "author"
					},
					{
						"firstName": "Raquel Boso",
						"lastName": "Perez",
						"creatorType": "author"
					},
					{
						"firstName": "Clare",
						"lastName": "Tanton",
						"creatorType": "author"
					},
					{
						"firstName": "Chris",
						"lastName": "Bonell",
						"creatorType": "author"
					},
					{
						"firstName": "Pam",
						"lastName": "Sonnenberg",
						"creatorType": "author"
					},
					{
						"firstName": "Catherine H.",
						"lastName": "Mercer",
						"creatorType": "author"
					},
					{
						"firstName": "Kirstin R.",
						"lastName": "Mitchell",
						"creatorType": "author"
					},
					{
						"firstName": "Nigel",
						"lastName": "Field",
						"creatorType": "author"
					}
				],
				"date": "2021-08-16",
				"abstractNote": "Background: Britain’s National Surveys of Sexual Attitudes and Lifestyles (Natsal) have been undertaken decennially since 1990 and provide a key data source underpinning sexual and reproductive health (SRH) policy. The COVID-19 pandemic disrupted many aspects of sexual lifestyles, triggering an urgent need for population-level data on sexual behaviour, relationships, and service use at a time when gold-standard in-person, household-based surveys with probability sampling were not feasible. We designed the Natsal-COVID study to understand the impact of COVID-19 on the nation’s SRH and assessed the sample representativeness. Methods: Natsal-COVID Wave 1 data collection was conducted four months (29/7-10/8/2020) after the announcement of Britain’s first national lockdown (23/03/2020). This was an online web-panel survey administered by survey research company, Ipsos MORI. Eligible participants were resident in Britain, aged 18-59 years, and the sample included a boost of those aged 18-29. Questions covered participants’ sexual behaviour, relationships, and SRH service use. Quotas and weighting were used to achieve a quasi-representative sample of the British general population. Participants meeting criteria of interest and agreeing to recontact were selected for qualitative follow-up interviews. Comparisons were made with contemporaneous national probability surveys and Natsal-3 (2010-12) to understand bias. Results: 6,654 participants completed the survey and 45 completed follow-up interviews. The weighted Natsal-COVID sample was similar to the general population in terms of gender, age, ethnicity, rurality, and, among sexually-active participants, numbers of sexual partners in the past year. However, the sample was more educated, contained more sexually-inexperienced people, and included more people in poorer health. Conclusions: Natsal-COVID Wave 1 rapidly collected quasi-representative population data to enable evaluation of the early population-level impact of COVID-19 and lockdown measures on SRH in Britain and inform policy. Although sampling was less representative than the decennial Natsals, Natsal-COVID will complement national surveillance data and Natsal-4 (planned for 2022).",
				"extra": "Type: article",
				"institution": "Wellcome Open Research",
				"language": "en",
				"libraryCatalog": "wellcomeopenresearch.org",
				"reportNumber": "6:209",
				"rights": "http://creativecommons.org/licenses/by/4.0/",
				"shortTitle": "Methodology of Natsal-COVID Wave 1",
				"url": "https://wellcomeopenresearch.org/articles/6-209",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "COVID-19"
					},
					{
						"tag": "online survey"
					},
					{
						"tag": "population estimates"
					},
					{
						"tag": "relationships"
					},
					{
						"tag": "sexual behaviour"
					},
					{
						"tag": "sexual health"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://wellcomeopenresearch.org/articles/2-83",
		"items": [
			{
				"itemType": "report",
				"title": "H3K36me3 and PSIP1/LEDGF associate with several DNA repair proteins, suggesting their role in efficient DNA repair at actively transcribing loci",
				"creators": [
					{
						"firstName": "Jayakumar",
						"lastName": "Sundarraj",
						"creatorType": "author"
					},
					{
						"firstName": "Gillian C. A.",
						"lastName": "Taylor",
						"creatorType": "author"
					},
					{
						"firstName": "Alex von",
						"lastName": "Kriegsheim",
						"creatorType": "author"
					},
					{
						"firstName": "Madapura M.",
						"lastName": "Pradeepa",
						"creatorType": "author"
					}
				],
				"date": "2021-08-16",
				"abstractNote": "Background: Trimethylation at histone H3 at lysine 36 (H3K36me3) is associated with expressed gene bodies and recruit proteins implicated in transcription, splicing and DNA repair. PC4 and SF2 interacting protein (PSIP1/LEDGF) is a transcriptional coactivator, possesses an H3K36me3 reader PWWP domain. Alternatively spliced isoforms of PSIP1 binds to H3K36me3 and suggested to function as adaptor proteins to recruit transcriptional modulators, splicing factors and proteins that promote homology-directed repair (HDR), to H3K36me3 chromatin. Methods: We performed chromatin immunoprecipitation of H3K36me3 followed by quantitative mass spectrometry (qMS) to identify proteins associated with H3K36 trimethylated chromatin in mouse embryonic stem cells (mESCs). We also performed stable isotope labelling with amino acids in cell culture (SILAC) followed by qMS for a longer isoform of PSIP1 (PSIP/p75) and MOF/KAT8 in mESCs and mouse embryonic fibroblasts ( MEFs). Furthermore, immunoprecipitation followed by western blotting was performed to validate the qMS data. DNA damage in PSIP1 knockout MEFs was assayed by a comet assay. Results: Proteomic analysis shows the association of proteins involved in transcriptional elongation, RNA processing and DNA repair with H3K36me3 chromatin. Furthermore, we show DNA repair proteins like PARP1, gamma H2A.X, XRCC1, DNA ligase 3, SPT16, Topoisomerases and BAZ1B are predominant interacting partners of PSIP /p75. We further validated the association of PSIP/p75 with PARP1, hnRNPU and gamma H2A.X&nbsp; and also demonstrated accumulation of damaged DNA in PSIP1 knockout MEFs. Conclusions: In contrast to the previously demonstrated role of H3K36me3 and PSIP/p75 in promoting homology-directed repair (HDR), our data support a wider role of H3K36me3 and PSIP1 in maintaining the genome integrity by recruiting proteins involved in DNA damage response pathways to the actively transcribed loci.",
				"extra": "Type: article",
				"institution": "Wellcome Open Research",
				"language": "en",
				"libraryCatalog": "wellcomeopenresearch.org",
				"reportNumber": "2:83",
				"rights": "http://creativecommons.org/licenses/by/4.0/",
				"url": "https://wellcomeopenresearch.org/articles/2-83",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "DNA repair"
					},
					{
						"tag": "H3K36me3"
					},
					{
						"tag": "LEDGF"
					},
					{
						"tag": "MOF"
					},
					{
						"tag": "PSIP1"
					},
					{
						"tag": "SILAC"
					},
					{
						"tag": "mass spectrometry"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://hrbopenresearch.org/articles/4-87",
		"items": [
			{
				"itemType": "report",
				"title": "Effectiveness of quality improvement strategies for type 1 diabetes in children and adolescents: a systematic review protocol",
				"creators": [
					{
						"firstName": "Paul M.",
						"lastName": "Ryan",
						"creatorType": "author"
					},
					{
						"firstName": "Michael",
						"lastName": "Zahradnik",
						"creatorType": "author"
					},
					{
						"firstName": "Kristin J.",
						"lastName": "Konnyu",
						"creatorType": "author"
					},
					{
						"firstName": "Tamara",
						"lastName": "Rader",
						"creatorType": "author"
					},
					{
						"firstName": "Michael",
						"lastName": "Halasy",
						"creatorType": "author"
					},
					{
						"firstName": "Rayzel",
						"lastName": "Shulman",
						"creatorType": "author"
					},
					{
						"firstName": "Noah",
						"lastName": "Ivers",
						"creatorType": "author"
					},
					{
						"firstName": "Colin P.",
						"lastName": "Hawkes",
						"creatorType": "author"
					},
					{
						"firstName": "Jeremy M.",
						"lastName": "Grimshaw",
						"creatorType": "author"
					}
				],
				"date": "2021-08-10",
				"abstractNote": "Introduction: Optimal glycaemic control is often a challenge in children and adolescents with type 1 diabetes (T1D). Implementation of patient, clinician or organisation-targeted quality improvement (QI) strategies has been proven to be beneficial in terms of improving glycaemic outcomes in adults living with diabetes. This review aims to assess the effectiveness of such QI interventions in improving glycaemic control, care delivery, and screening rates in children and adolescents with T1D. Methods and analysis: MEDLINE, EMBASE, CINAHL and Cochrane CENTRAL databases will be searched for relevant studies up to January 2021. Trial registries, ClinicalTrials.gov and ICTRP, will also be explored for any ongoing trials of relevance. We will include trials which examine QI strategies as defined by a modified version of the Cochrane Effective Practice and Organisation of Care 2015 Taxonomy in children (&lt;18 years) with a diagnosis of T1D. The primary outcome to be assessed is glycated haemoglobin (HbA1c), although a range of secondary outcomes relating to clinical management, adverse events, healthcare engagement, screening rates and psychosocial parameters will also be assessed. Our primary intention is to generate a best-evidence narrative to summarise and synthesise the resulting studies. If a group of studies are deemed to be highly similar, then a meta-analysis using a random effects model will be considered. Cochrane Risk of Bias 1.0 tool will be applied for quality assessment. All screening, data extraction and quality assessment will be performed by two independent researchers. Dissemination: The results of this review will be disseminated through peer-reviewed publication in order to inform invested partners (e.g., Paediatric Endocrinologists) on the potential of QI strategies to improve glycaemic management and other related health outcomes in children with T1D, thereby guiding best practices in the outpatient management of the disorder. PROSPERO registration number: CRD42021233974 (28/02/2021).",
				"extra": "Type: article",
				"institution": "HRB Open Research",
				"language": "en",
				"libraryCatalog": "hrbopenresearch.org",
				"reportNumber": "4:87",
				"rights": "http://creativecommons.org/licenses/by/4.0/",
				"shortTitle": "Effectiveness of quality improvement strategies for type 1 diabetes in children and adolescents",
				"url": "https://hrbopenresearch.org/articles/4-87",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Quality improvement"
					},
					{
						"tag": "adolescents"
					},
					{
						"tag": "children"
					},
					{
						"tag": "diabetes"
					},
					{
						"tag": "glycaemic management"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://hrbopenresearch.org/browse/articles",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://f1000research.com/search?q=test",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://gatesopenresearch.org/articles/5-122",
		"items": [
			{
				"itemType": "report",
				"title": "Young infant clinical signs study&shy;&shy;, Pakistan: a data note",
				"creators": [
					{
						"firstName": "Shahira",
						"lastName": "Shahid",
						"creatorType": "author"
					},
					{
						"firstName": "Shiyam Sunder",
						"lastName": "Tikmani",
						"creatorType": "author"
					},
					{
						"firstName": "Nick",
						"lastName": "Brown",
						"creatorType": "author"
					},
					{
						"firstName": "Anita K. M.",
						"lastName": "Zaidi",
						"creatorType": "author"
					},
					{
						"firstName": "Fyezah",
						"lastName": "Jehan",
						"creatorType": "author"
					},
					{
						"firstName": "Muhammad Imran",
						"lastName": "Nisar",
						"creatorType": "author"
					}
				],
				"date": "2021-08-12",
				"abstractNote": "Neonatal sepsis is the leading cause of child death globally with most of these deaths occurring in the first week of life. &nbsp;It is of utmost public health importance that clinical signs predictive of severe illness and need for referral are identified early in the course of illness. From 2002-2005, a multi country trial called the Young Infant Clinical Signs Study (YICSS) was conducted in seven sites across three South-Asian (Bangladesh, India, and Pakistan), two African (Ghana, and South Africa), and one South American (Bolivia) country. The study aimed to develop a simplified algorithm to be used by primary healthcare workers for the identification of sick young infants needing prompt referral and treatment. The main study enrolled 8,889 young infants between the ages of 0-59 days old. This dataset contains observations on 2950 young infants aged 0-59 days from the Pakistan site. The data was collected between 2003-2004 with information on the most prevalent signs and symptoms. The data from this study was used to update the Integrated Management of Childhood Illness guidelines. The World Health Organisation (WHO) seven-sign algorithm has been used in other major community-based trials to study possible serious bacterial infection and its treatment regimens.",
				"extra": "Type: article",
				"institution": "Gates Open Research",
				"language": "en",
				"libraryCatalog": "gatesopenresearch.org",
				"reportNumber": "5:122",
				"rights": "http://creativecommons.org/licenses/by/4.0/",
				"shortTitle": "Young infant clinical signs study&shy;&shy;, Pakistan",
				"url": "https://gatesopenresearch.org/articles/5-122",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Pakistan"
					},
					{
						"tag": "clinical signs"
					},
					{
						"tag": "community"
					},
					{
						"tag": "severe illness requiring hospitalization"
					},
					{
						"tag": "young infants"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
