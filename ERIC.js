{
	"translatorID": "e4660e05-a935-43ec-8eec-df0347362e4c",
	"label": "ERIC",
	"creator": "Sebastian Karcher",
	"target": "^https?://(www\\.)?eric\\.ed\\.gov/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-10-10 14:26:15"
}

/*
	Translator
   Copyright (C) 2013 Sebastian Karcher

   This program is free software: you can redistribute it and/or modify
   it under the terms of the GNU Affero General Public License as published by
   the Free Software Foundation, either version 3 of the License, or
   (at your option) any later version.

   This program is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU Affero General Public License for more details.

   You should have received a copy of the GNU Affero General Public License
   along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/


function detectWeb(doc, url) {
	if (/id=E[JD]\d+/.test(url)) {
		return findType(doc, url);
	}
	else if (getSearchResults(doc, false)) {
		return "multiple";
	}
	return false;
}

function findType(doc, url) {
	var ERICid = url.match(/id=(E[JD]\d+)/)[1];
	var typeSecondary = ZU.xpathText(doc, '//div[@class="sInfo"]//div[strong[contains(text(), "Publication Type")]]');
	// Trying to do reasonable guesses for non-journal types
	if (ERICid.startsWith("ED")) {
		if (typeSecondary) {
			if (typeSecondary.includes("Books")) {
				return "book";
			}
			else if (typeSecondary.includes("Dissertations/Theses")) {
				return "thesis";
			}
			else {
				return "report";
			}
		}
		else {
			// Report is the most plausible fallback
			return "report";
		}
	}
	else {
		return "journalArticle";
	}
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll("div.r_t > a[href*='id=']");
	for (var i = 0; i < rows.length; i++) {
		var href = rows[i].href;
		var title = ZU.trimInternal(rows[i].textContent);
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
		if (items) {
			await Promise.all(
				Object.keys(items)
					.map(url => requestDocument(url).then(scrape))
			);
		}
	}
	else {
		await scrape(doc, url);
	}
}


async function scrape(doc, url = doc.location.href) {
	var abstract = ZU.xpathText(doc, '//div[@class="abstract"]');
	var DOI = ZU.xpathText(doc, '//a[contains(text(), "Direct link")]/@href');
	var ERICid = url.match(/id=(E[JD]\d+)/)[1];
	var authorString = ZU.xpathText(doc, '//meta[@name="citation_author"]/@content');
	let translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	
	translator.setHandler('itemDone', (_obj, item) => {
		if (abstract) item.abstractNote = abstract.replace(/^\|/, "");

		item.title = item.title.replace(/.\s*$/, "");
		item.itemType = findType(doc, url);
		if (authorString.includes("|")) {
			item.creators = [];
			var authors = authorString.split("|");
			for (var i = 0; i < authors.length; i++) {
				item.creators.push(ZU.cleanAuthor(authors[i], "author", true));
			}
		}
		if (item.ISSN) {
			Z.debug(item.ISSN);
			item.ISSN = ZU.cleanISSN(item.ISSN.replace(/ISSN-/, ""));
		}
		if (item.ISBN) item.ISBN = ZU.cleanISBN(item.ISBN.replace('ISBN', ''));
		if (item.publisher) item.publisher = item.publisher.replace(/\..+/, "");
		if (DOI) {
			item.DOI = ZU.cleanDOI(decodeURIComponent(DOI));
		}
		if (item.itemType == "journalArticle" && item.publisher == item.publicationTitle) {
			delete item.publisher; // Publisher & Publication Title are often identical
		}

		item.extra = "ERIC Number: " + ERICid;
		// Only include URL if full text is hosted on ERIC
		if (!ZU.xpath(doc, '//div[@id="r_colR"]//img[@alt="PDF on ERIC"]').length) {
			delete item.url;
		}
		else {
			// use clean URL
			item.url = "https://eric.ed.gov/?id=" + ERICid;
		}
		item.libraryCatalog = "ERIC";
		item.complete();
	});

	let em = await translator.getTranslatorObject();
	await em.doWeb(doc, url);
}


/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://eric.ed.gov/?id=EJ956651",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Collaborating with Parents to Establish Behavioral Goals in Child-Centered Play Therapy",
				"creators": [
					{
						"firstName": "Phyllis B.",
						"lastName": "Post",
						"creatorType": "author"
					},
					{
						"firstName": "Peggy L.",
						"lastName": "Ceballos",
						"creatorType": "author"
					},
					{
						"firstName": "Saundra L.",
						"lastName": "Penn",
						"creatorType": "author"
					}
				],
				"date": "2012/01/00",
				"DOI": "10.1177/1066480711425472",
				"ISSN": "1066-4807",
				"abstractNote": "The purpose of this article is to provide specific guidelines for child-centered play therapists to set behavioral outcome goals to effectively work with families and to meet the demands for accountability in the managed care environment. The child-centered play therapy orientation is the most widely practiced approach among play therapists who identify a specific theoretical orientation. While information about setting broad objectives is addressed using this approach to therapy, explicit guidelines for setting behavioral goals, while maintaining the integrity of the child-centered theoretical orientation, are needed. The guidelines are presented in three phases of parent consultation: (a) the initial engagement with parents, (b) the ongoing parent consultations, and (c) the termination phase. In keeping with the child-centered approach, the authors propose to work with parents from a person-centered orientation and seek to appreciate how cultural influences relate to parents' concerns and goals for their children. A case example is provided to demonstrate how child-centered play therapists can accomplish the aforementioned goals.",
				"extra": "ERIC Number: EJ956651",
				"issue": "1",
				"language": "en",
				"libraryCatalog": "ERIC",
				"pages": "51-57",
				"publicationTitle": "Family Journal: Counseling and Therapy for Couples and Families",
				"volume": "20",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Cooperative Planning"
					},
					{
						"tag": "Counseling Techniques"
					},
					{
						"tag": "Counselor Role"
					},
					{
						"tag": "Cultural Influences"
					},
					{
						"tag": "Cultural Relevance"
					},
					{
						"tag": "Guidelines"
					},
					{
						"tag": "Interpersonal Relationship"
					},
					{
						"tag": "Parent Participation"
					},
					{
						"tag": "Play Therapy"
					},
					{
						"tag": "Therapy"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://eric.ed.gov/?q=(prekindergarten+OR+kindergarten)+AND+literacy",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://eric.ed.gov/?q=(prekindergarten+OR+kindergarten)+AND+literacy&ff1=pubBooks&id=ED509979",
		"items": [
			{
				"itemType": "book",
				"title": "The Building Blocks of Preschool Success",
				"creators": [
					{
						"firstName": "Katherine A.",
						"lastName": "Beauchat",
						"creatorType": "author"
					},
					{
						"firstName": "Katrin L.",
						"lastName": "Blamey",
						"creatorType": "author"
					},
					{
						"firstName": "Sharon",
						"lastName": "Walpole",
						"creatorType": "author"
					}
				],
				"date": "2010/06/00",
				"ISBN": "9781606236949",
				"abstractNote": "Written expressly for preschool teachers, this engaging book explains the \"whats,\" \"whys,\" and \"how-tos\" of implementing best practices for instruction in the preschool classroom. The authors show how to target key areas of language and literacy development across the entire school day, including whole-group and small-group activities, center time, transitions, and outdoor play. Detailed examples in every chapter illustrate what effective instruction and assessment look like in three distinct settings: a school-based pre-kindergarten, a Head Start center with many English language learners, and a private suburban preschool. Helpful book lists, charts, and planning tools are featured, including reproducible materials. Contents include: (1) The Realities of Preschool; (2) A Focus on Oral Language and Vocabulary Development; (3) Comprehension; (4) Phonological Awareness; (5) Print and Alphabet Awareness; (6) Emergent Writing; (7) Tracking Children's Progress: The Role of Assessment in Preschool Classrooms; and (8) Making It Work for Adults and Children.",
				"extra": "ERIC Number: ED509979",
				"language": "en",
				"libraryCatalog": "ERIC",
				"publisher": "Guilford Press",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Alphabets"
					},
					{
						"tag": "Best Practices"
					},
					{
						"tag": "Classroom Environment"
					},
					{
						"tag": "Disadvantaged Youth"
					},
					{
						"tag": "Educational Assessment"
					},
					{
						"tag": "Emergent Literacy"
					},
					{
						"tag": "English (Second Language)"
					},
					{
						"tag": "Group Activities"
					},
					{
						"tag": "Instructional Materials"
					},
					{
						"tag": "Language Skills"
					},
					{
						"tag": "Oral Language"
					},
					{
						"tag": "Phonological Awareness"
					},
					{
						"tag": "Play"
					},
					{
						"tag": "Preschool Children"
					},
					{
						"tag": "Preschool Teachers"
					},
					{
						"tag": "Reading Instruction"
					},
					{
						"tag": "Reprography"
					},
					{
						"tag": "Second Language Learning"
					},
					{
						"tag": "Suburban Schools"
					},
					{
						"tag": "Vocabulary Development"
					},
					{
						"tag": "Writing Instruction"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://eric.ed.gov/?id=EJ906692",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Determining Faculty Needs for Delivering Accessible Electronically Delivered Instruction in Higher Education",
				"creators": [
					{
						"firstName": "Marsha A.",
						"lastName": "Gladhart",
						"creatorType": "author"
					}
				],
				"date": "2010/00/00",
				"abstractNote": "The purpose of this study was to determine if a need exists for faculty training to improve accommodation for students with disabilities enrolled in electronically delivered courses at a statewide university system. An online survey was used to determine if instructors had students who had been identified as needing accommodation in their online courses, to identify which tools instructors used in electronically delivered instruction, and to determine how familiar the instructors were with strategies for accommodating students with disabilities in their courses. Over half the respondents reported identifying students in their classes with disabilities either by an official notice or through other means of identification. The respondents identified a variety of electronic delivery tools used to provide instruction in distance courses. A low percentage of the faculty surveyed reported they were aware of strategies to improve accessibility in their electronically delivered courses. (Contains 6 tables.)",
				"extra": "ERIC Number: EJ906692",
				"issue": "3",
				"language": "en",
				"libraryCatalog": "ERIC",
				"pages": "185-196",
				"publicationTitle": "Journal of Postsecondary Education and Disability",
				"url": "https://eric.ed.gov/?id=EJ906692",
				"volume": "22",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Academic Accommodations (Disabilities)"
					},
					{
						"tag": "College Faculty"
					},
					{
						"tag": "Delivery Systems"
					},
					{
						"tag": "Disabilities"
					},
					{
						"tag": "Disability Identification"
					},
					{
						"tag": "Educational Needs"
					},
					{
						"tag": "Educational Practices"
					},
					{
						"tag": "Educational Strategies"
					},
					{
						"tag": "Electronic Learning"
					},
					{
						"tag": "Familiarity"
					},
					{
						"tag": "Mail Surveys"
					},
					{
						"tag": "Needs Assessment"
					},
					{
						"tag": "Online Courses"
					},
					{
						"tag": "Teacher Attitudes"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://eric.ed.gov/?q=test&ff1=pubReports+-+Research&ff2=pubReports+-+Descriptive&id=ED211592",
		"items": [
			{
				"itemType": "report",
				"title": "Test Design Project: Studies in Test Bias. Annual Report",
				"creators": [
					{
						"firstName": "David",
						"lastName": "McArthur",
						"creatorType": "author"
					}
				],
				"date": "1981/11/01",
				"abstractNote": "Item bias in a multiple-choice test can be detected by appropriate analyses of the persons x items scoring matrix. This permits comparison of groups of examinees tested with the same instrument. The test may be biased if it is not measuring the same thing in comparable groups, if groups are responding to different aspects of the test items, or if cultural and linguistic issues take precedence. An empirical study of the question of bias as shown by these techniques was conducted. Five related schemes for the statistical analysis of bias were applied to the Comprehensive Test of Basic Skills which was administered in either the English or Spanish language version at two levels of elementary school in bilingual education programs. The objectives measured were recall or recognition  ability, ability to translate or convert verbal or symbolic concepts, ability to comprehend concepts, ability to apply techniques, and ability to extend interpretation beyond stated information. The results indicated that several items in the tests showed strong evidence of bias, corroborated by a separate analysis of linguistic and cultural sources of bias for many items. (Author/DWH)",
				"extra": "ERIC Number: ED211592",
				"language": "en",
				"libraryCatalog": "ERIC",
				"shortTitle": "Test Design Project",
				"url": "https://eric.ed.gov/?id=ED211592",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Bilingual Education"
					},
					{
						"tag": "Bilingual Students"
					},
					{
						"tag": "Elementary Education"
					},
					{
						"tag": "Ethnicity"
					},
					{
						"tag": "Non English Speaking"
					},
					{
						"tag": "Research Methodology"
					},
					{
						"tag": "Statistical Analysis"
					},
					{
						"tag": "Test Bias"
					},
					{
						"tag": "Test Construction"
					},
					{
						"tag": "Writing Evaluation"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
