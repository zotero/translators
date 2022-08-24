{
	"translatorID": "374c83fa-58ef-47cf-af23-e42630203ce7",
	"label": "International Nuclear Information System",
	"creator": "Abe Jellinek",
	"target": "^https?://inis\\.iaea\\.org/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-08-12 23:15:14"
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


function detectWeb(doc, url) {
	if (url.includes('recordsFor=SingleRecord')) {
		if (text(doc, '.recordtype').includes('Book')) {
			return 'book';
		}
		else if (text(doc, '.recordtype').includes('Report')) {
			return 'report';
		}
		else if (text(doc, '.literaturetype').includes('Conference')) {
			return 'conferencePaper';
		}
		else {
			return 'journalArticle';
		}
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.g1');
	for (let row of rows) {
		let urlOrRef = attr(row, 'a.fileTypeIcon[href*=".pdf"]', 'href');
		if (!urlOrRef) {
			urlOrRef = attr(row, '.lnkCitation', 'id').match(/(\d+)/)[1];
		}
		
		let title = ZU.trimInternal(text(row, '.title-link'));
		if (!urlOrRef || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[urlOrRef] = title;
	}
	return found ? items : false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (!items) return;
			for (let urlOrRef of Object.keys(items)) {
				if (urlOrRef.includes('.pdf')) {
					// extract the ref number from the PDF URL
					scrape(urlOrRef.match(/([^/]+)\.pdf/)[1], urlOrRef);
				}
				else {
					scrape(urlOrRef, null);
				}
			}
		});
	}
	else {
		let refNumber = url.match(/RN=([^&]+)/)[1];
		// no way to get the PDF from the abstract page, and no easy way to get
		// to the abstract page for an article with a PDF, so this is fine.
		scrape(refNumber, null);
	}
}

function scrape(refNumber, pdfURL) {
	let risURL = '/search/citationdownload.aspx';
	let body = `RN=${refNumber}&citationFormat=Ris`;
	
	ZU.doPost(risURL, body, function (text) {
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
		translator.setString(text);
		translator.setHandler("itemDone", function (obj, item) {
			delete item.url;
			
			if (pdfURL) {
				item.attachments.push({
					title: 'Full Text PDF',
					mimeType: 'application/pdf',
					url: pdfURL
				});
			}
			
			item.extra = (item.extra || '') + `\nINIS Reference Number: ${refNumber}`;
			
			item.complete();
		});
		translator.translate();
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://inis.iaea.org/search/searchsinglerecord.aspx?recordsFor=SingleRecord&RN=25072702",
		"items": [
			{
				"itemType": "book",
				"title": "Neuropsychiatric and psychologic effects of A-bomb radiation",
				"creators": [
					{
						"lastName": "Yamada",
						"firstName": "Michiko",
						"creatorType": "author"
					},
					{
						"lastName": "Sasaki",
						"firstName": "Hideo .",
						"creatorType": "author"
					}
				],
				"date": "1992",
				"abstractNote": "Few studies have assessed the influences of A-bombing from both psychiatric and psychologic\npoints of view This chapter deals with the knowledge of neuropsychiatric and psychologic\ninfluences of A-bombing Many A-bomb survivors were exposed not only to radiation but\nalso to rapid environmental alterations, such as death of family members and destruction\nof living In addition, they suffered from sequelae and anxiety Naturally, these were\nconsidered to cause psychological disturbance including autonomic imbalance and neurosis\nPsychological survey, made immediately after A-bombing, is presented, with special\nattention to behavioral patterns in 54 A-bomb survivors by dividing them into 5 stimulation\ngroups Radiation syndrome occurring early after exposure and leukemia or cancer occurring\nlater were referred to as 'Genbaku-sho' (A-bomb disease) A-bomb survivors' physically\neventful conditions tended to induce mental anxiety or the contrary Depression and\nphobia seemed to have correlated with physical conditions In addition to 'A-bomb disease',\nmass media, dealing with 'A-bomb neurosis,' 'marriage in A-bomb survivors,' 'suicide\nin A-bomb survivors,' 'A-bomb survivors orphan,' and 'lonely old A-bomb survivors,'\nhad a great impact on A-bomb survivors For in uterus exposed and infantile A-bomb\nsurvivors, there was no significant difference between the exposed and non-exposed\ngroups, although the incidence of eye tremor and sleeping disorder is found to be\nhigher in the in uterus exposed group than the control group (NK)",
				"extra": "INIS Reference Number: 25072702",
				"libraryCatalog": "International Nuclear Information System",
				"place": "Japan",
				"publisher": "Bunkodo Co Ltd",
				"series": "Effects of A-bomb radiation on the human body",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://inis.iaea.org/search/search.aspx?search-option=everywhere&orig_q=fission&fulltext=true",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://inis.iaea.org/search/search.aspx?search-option=everywhere&orig_q=test",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://inis.iaea.org/search/searchsinglerecord.aspx?recordsFor=SingleRecord&RN=19023241",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Possible checking of technical parameters in nondestructive materials and products testing",
				"creators": [
					{
						"lastName": "Kesl",
						"firstName": "J.",
						"creatorType": "author"
					}
				],
				"date": "1987",
				"abstractNote": "The requirements are summed up for partial technical parameters of instruments and\nfacilities for nondestructive testing by ultrasound, radiography, by magnetic, capillary\nand electric induction methods The requirements and procedures for testing instrument\nperformance are presented for the individual methods as listed in domestic and foreign\nstandards, specifications and promotional literature The parameters to be tested and\nthe methods of testing, including the testing and calibration instruments are shown\nin tables The Czechoslovak standards are listed currently valid for nondestructive\nmaterials testing (MD)",
				"extra": "INIS Reference Number: 19023241",
				"issue": "3",
				"libraryCatalog": "International Nuclear Information System",
				"pages": "104-113",
				"publicationTitle": "Ceskoslovenska Standardizace",
				"series": "Moznosti overeni technickych parametru pri provadeni nedestruktivnich defektoskopickych zkousek materialu a vyrobku",
				"volume": "17",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://inis.iaea.org/search/searchsinglerecord.aspx?recordsFor=SingleRecord&RN=46011529",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "Proceedings of the Korean Society for Nondestructive Testing Spring Meeting 1995",
				"creators": [
					{
						"lastName": "The Korean Society for Nondestructive Testing",
						"firstName": "Seoul (Korea, Republic of)",
						"creatorType": "author"
					}
				],
				"date": "1995",
				"abstractNote": "This proceedings contains articles of the Korean Society for Nondestructive Testing\nSpring Meeting, 1995 It was held on May 10, 1995 in Seoul, Korea and subject of the\nKorean Society for Nondestructive Testing Spring Meeting 1995 This proceedings is\ncomprised of 2 sessions",
				"conferenceName": "1995 Spring Meeting of the Korean Society for Nondestructive Testing",
				"extra": "INIS Reference Number: 46011529",
				"libraryCatalog": "International Nuclear Information System",
				"place": "Korea, Republic of",
				"publisher": "KSNT",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://inis.iaea.org/search/searchsinglerecord.aspx?recordsFor=SingleRecord&RN=42080196",
		"items": [
			{
				"itemType": "report",
				"title": "Test equipment development for under-water vibration characteristics of dual-cooled fuel test assembly",
				"creators": [
					{
						"lastName": "Lee",
						"firstName": "Kang Hee",
						"creatorType": "author"
					},
					{
						"lastName": "Kang",
						"firstName": "Heung Seok",
						"creatorType": "author"
					},
					{
						"lastName": "Kim",
						"firstName": "Hyung Kyu",
						"creatorType": "author"
					},
					{
						"lastName": "Yoon",
						"firstName": "Kyung Ho",
						"creatorType": "author"
					},
					{
						"lastName": "Lee",
						"firstName": "Young Ho",
						"creatorType": "author"
					},
					{
						"lastName": "Kim",
						"firstName": "Jae Yong",
						"creatorType": "author"
					}
				],
				"date": "2010",
				"abstractNote": "Because of the structural peculiarity of the dual-cooled fuel against a conventional\nfuel, development of new experimental test equipment and methods for measuring dynamic\nparameters under water is needed to compare design characteristics and to prepare\nfuture structural design Major parts of the test equipment consists of square-steel\nwater channel, horizontal ports for shaker attachment and visual windows for measurement\nand installation Electromagnetic shaker is used as a major excitation device Non-contact\nlaser vibration sensor and under water accelerometer are used as a vibration measurement\nsensor Detail design parameters were determined by the test goal-oriented design specifications\nand requirements Basic functioning tests and performance testing using a test fuel\nassembly were carried out Functioning tests were involved in a dimension check, vertical\n/ horizontal flatness evaluation, leak test and installation/demounting of the test\nassembly Performance test includes an initial-deflection-sudden-release, impact, sine,\nrandom vibration testing of the 4x4 annular test fuel bundle in air and under water\nThis under-water test equipment names as 'Underwater Modal Testing Equipment for Dual-Cooled\nFuel Test Assembly: UMAP-DF' Test results for the 4x4 test partial fuel assembly shows\nreliability and validity of the newly developed test equipment for the dynamic testing\nin terms of external noise and repeatability",
				"extra": "KAERI/TR--4202/2010\nINIS Reference Number: 42080196",
				"libraryCatalog": "International Nuclear Information System",
				"pages": "47",
				"place": "Korea, Republic of",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
