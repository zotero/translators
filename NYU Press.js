{
	"translatorID": "2ca2c054-7084-458f-b493-86e388284720",
	"label": "NYU Press",
	"creator": "Nathan Kim",
	"target": "https?://nyupress\\.org/([0-9]){13}",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2023-05-12 00:33:10"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2022 Nathan Kim

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

function detectWeb() {
	return "book";
}

function doWeb(doc, url) {
	var item = new Zotero.Item("book");
	item.date = doc.querySelector(".sp__published").textContent.replace("Published: ", "");
	item.ISBN = doc.querySelector(".sp__isbn13").textContent;

	for (let roleNode of doc.querySelectorAll('.sp__the-author')) {
		let role;
		if (roleNode.textContent.match("Edited")) {
			role = "editor";
		}
		else if (roleNode.textContent.match("Foreword|Introduction")) {
			role = "contributor";
		}
		else {
			role = "author";
		}
		for (let authorNode of roleNode.querySelectorAll(".sp__author-link")) {
			item.creators.push(ZU.cleanAuthor(authorNode.textContent, role));
		}
	}

	item.numPages = doc.querySelector(".sp__the-pages").textContent.replace(" Pages", "");
	item.abstractNote = doc.querySelector(".tabs__panel--description p").textContent;
	let series = doc.querySelector(".book-wrapper__top-section--details h3");
	item.series = series ? series.textContent : '';
	item.publisher = doc.querySelector(".sp__the-publisher").textContent.replace("Published by: ", "");

	item.url = url;
	var title = doc.querySelector(".book-wrapper__top-section--details h1").textContent;
	var subtitle = doc.querySelector(".book-wrapper__top-section--details h2");
	item.title = `${title}: ${subtitle ? subtitle.textContent : ''}`;

	item.attachments.push({
		title: "Snapshot",
		document: doc
	});

	item.complete();
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://nyupress.org/9781479813049/motherhood-on-ice/",
		"detectedItemType": "book",
		"items": [
			{
				"itemType": "book",
				"title": "Motherhood on Ice: The Mating Gap and Why Women Freeze Their Eggs",
				"creators": [
					{
						"firstName": "Marcia C.",
						"lastName": "Inhorn",
						"creatorType": "author"
					}
				],
				"date": "May 2023",
				"ISBN": "9781479813049",
				"abstractNote": "Answers the question: Why are women freezing their eggs?Why are women freezing their eggs in record numbers? Motherhood on Ice explores this question by drawing on the stories of more than 150 women who pursued fertility preservation technology. Moving between narratives of pain and empowerment, these nuanced personal stories reveal the complexity of women’s lives as they struggle to preserve and extend their fertility. Contrary to popular belief, egg freezing is rarely about women postponing fertility for the sake of their careers. Rather, the most-educated women are increasingly forced to delay childbearing because they face a mating gap—a lack of eligible, educated, equal partners ready for marriage and parenthood. For these women, egg freezing is a reproductive backstop, a technological attempt to bridge the gap while waiting for the right partner. But it is not an easy choice for most. Their stories reveal the extent to which it is logistically complicated, physically taxing, financially demanding, emotionally draining, and uncertain in its effects. In this powerful book, women share their reflections on their clinical encounters, as well as the immense hopes and investments they place in this high-tech fertility preservation strategy. Race, religion, and the role of men in the lives of single women pursuing this technology are also explored.  A distinctly human portrait of an understudied and rapidly growing population, Motherhood on Ice examines what is at stake for women who take comfort in their frozen eggs while embarking on their quests for partnership, pregnancy, and parenting.",
				"libraryCatalog": "NYU Press",
				"numPages": "352",
				"publisher": "NYU Press",
				"series": "Anthropologies of American Medicine: Culture, Power, and Practice",
				"shortTitle": "Motherhood on Ice",
				"url": "https://nyupress.org/9781479813049/motherhood-on-ice/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
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
		"url": "https://nyupress.org/9781479808151/keywords-for-gender-and-sexuality-studies/",
		"detectedItemType": "book",
		"items": [
			{
				"itemType": "book",
				"title": "Keywords for Gender and Sexuality Studies:",
				"creators": [
					{
						"firstName": "The Keywords Feminist Editorial",
						"lastName": "Collective",
						"creatorType": "editor"
					}
				],
				"date": "November 2021",
				"ISBN": "9781479808151",
				"abstractNote": "Introduces key terms, debates, and histories for feminist studies in gender and sexualityKeywords for Gender and Sexuality Studies introduces readers to a set of terms that will aid them in understanding the central methodological and political stakes currently energizing feminist and queer studies. The volume deepens the analyses of this field by highlighting justice-oriented intersectional movements and foregrounding Black, Indigenous, and women of color feminisms; transnational feminisms; queer of color critique; trans, disability, and fat studies; feminist science studies; and critiques of the state, law, and prisons that emerge from queer and women of color justice movements. Many of the keywords featured in this publication call attention to the fundamental assumptions of humanism’s political and intellectual debates—from the racialized contours of property and ownership to eugenicist discourses of improvement and development. Interventions to these frameworks arise out of queer, feminist and anti-racist engagements with matter and ecology as well as efforts to imagine forms of relationality beyond settler colonial and imperialist epistemologiesReflecting the interdisciplinary breadth of the field, this collection of eighty essays by scholars across the social sciences and the humanities weaves together methodologies from science and technology studies, affect theory, and queer historiographies, as well as Black Studies, Latinx Studies, Asian American, and Indigenous Studies. Taken together, these essays move alongside the distinct histories and myriad solidarities of the fields to construct the much awaited Keywords for Gender and Sexuality Studies.",
				"libraryCatalog": "NYU Press",
				"numPages": "312",
				"publisher": "NYU Press",
				"series": "Keywords",
				"shortTitle": "Keywords for Gender and Sexuality Studies",
				"url": "https://nyupress.org/9781479808151/keywords-for-gender-and-sexuality-studies/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
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
		"url": "https://nyupress.org/9780814789216/the-health-of-newcomers/",
		"detectedItemType": "book",
		"items": [
			{
				"itemType": "book",
				"title": "The Health of Newcomers: Immigration, Health Policy, and the Case for Global Solidarity",
				"creators": [
					{
						"firstName": "Patricia",
						"lastName": "Illingworth",
						"creatorType": "author"
					},
					{
						"firstName": "Wendy E.",
						"lastName": "Parmet",
						"creatorType": "author"
					}
				],
				"date": "January 2017",
				"ISBN": "9780814789216",
				"abstractNote": "Immigration and health care are hotly debated and contentious issues. Policies that relate to both issues—to the health of newcomers—often reflect misimpressions about immigrants, and their impact on health care systems. Despite the fact that immigrants are typically younger and healthier than natives, and that many immigrants play a vital role as care-givers in their new lands, native citizens are often reluctant to extend basic health care to immigrants, choosing instead to let them suffer, to let them die prematurely, or to expedite their return to their home lands. Likewise, many nations turn against immigrants when epidemics such as Ebola strike, under the false belief that native populations can be kept well only if immigrants are kept out. In The Health of Newcomers, Patricia Illingworth and Wendy E. Parmet demonstrate how shortsighted and dangerous it is to craft health policy on the basis of ethnocentrism and xenophobia. Because health is a global public good and people benefit from the health of neighbor and stranger alike, it is in everyone’s interest to ensure the health of all. Drawing on rigorous legal and ethical arguments and empirical studies, as well as deeply personal stories of immigrant struggles, Illingworth and Parmet make the compelling case that global phenomena such as poverty, the medical brain drain, organ tourism, and climate change ought to inform the health policy we craft for newcomers and natives alike.",
				"libraryCatalog": "NYU Press",
				"numPages": "320",
				"publisher": "NYU Press",
				"shortTitle": "The Health of Newcomers",
				"url": "https://nyupress.org/9780814789216/the-health-of-newcomers/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
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
		"url": "https://nyupress.org/9781479871957/returns-of-war/",
		"detectedItemType": "book",
		"items": [
			{
				"itemType": "book",
				"title": "Returns of War: South Vietnam and the Price of Refugee Memory",
				"creators": [
					{
						"firstName": "Long T.",
						"lastName": "Bui",
						"creatorType": "author"
					}
				],
				"date": "November 2018",
				"ISBN": "9781479871957",
				"abstractNote": "The legacy and memory of wartime South Vietnam through the eyes of Vietnamese refugees In 1975, South Vietnam fell to communism, marking a stunning conclusion to the Vietnam War. Although this former ally of the United States has vanished from the world map, Long T. Bui maintains that its memory endures for refugees with a strong attachment to this ghost country. Blending ethnography with oral history, archival research, and cultural analysis, Returns of War considersReturns of War argues that Vietnamization--as Richard Nixon termed it in 1969--and the end of South Vietnam signals more than an example of flawed American military strategy, but a larger allegory of power, providing cover for U.S. imperial losses while denoting the inability of the (South) Vietnamese and other colonized nations to become independent, modern liberal subjects. Bui argues that the collapse of South Vietnam under Vietnamization complicates the already difficult memory of the Vietnam War, pushing for a critical understanding of South Vietnamese agency beyond their status as the war’s ultimate “losers.” Examining the lasting impact of Cold War military policy and culture upon the “Vietnamized” afterlife of war, this book weaves questions of national identity, sovereignty, and self-determination to consider the generative possibilities of theorizing South Vietnam as an incomplete, ongoing search for political and personal freedom.",
				"libraryCatalog": "NYU Press",
				"numPages": "256",
				"publisher": "NYU Press",
				"series": "Nation of Nations",
				"shortTitle": "Returns of War",
				"url": "https://nyupress.org/9781479871957/returns-of-war/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
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
		"url": "https://nyupress.org/9780889779563/trickster-tales-and-the-stories-of-chief-thunderchild/",
		"detectedItemType": "book",
		"items": [
			{
				"itemType": "book",
				"title": "Trickster Tales and the Stories of Chief Thunderchild:",
				"creators": [
					{
						"firstName": "Canon Edward",
						"lastName": "Ahenakew",
						"creatorType": "author"
					},
					{
						"firstName": "Heather",
						"lastName": "Hodgson",
						"creatorType": "editor"
					},
					{
						"firstName": "Maria",
						"lastName": "Campbell",
						"creatorType": "contributor"
					}
				],
				"date": "June 2024",
				"ISBN": "9780889779563",
				"abstractNote": "The second volume in the series collects the stories recited by Chief Thunderchild and places them next to Edward Ahenakew’s Cree trickster tales.When buffalo were many on the western plains, when Cree and Blackfoot warred in unrelenting enmity, when the Sun Dance and the shaking tent were still a way of life—these were the days of Chief Thunderchild, who roamed the Saskatchewan plains and whose stories celebrate a fierce and vanished freedom. The second volume in the Collected Works of Edward Ahenakew series collects the stories recited by Chief Thunderchild (1849–1927) and presents them exactly as they were told to Canon Edward Ahenakew in 1923. This book includes the chronicles of the trickster wīsahkēcāhk’s adventures and teachings amongst the wilderness, presenting Edward Ahenekew’s versions of these traditional tales. Marking 100 years since Ahenakew’s historic meetings with Chief Thunderchild, this collection of stories reverberates with the wide expanse of sky, the song of the wind, and the sound of water.",
				"libraryCatalog": "NYU Press",
				"numPages": "184",
				"publisher": "University of Regina Press",
				"shortTitle": "Trickster Tales and the Stories of Chief Thunderchild",
				"url": "https://nyupress.org/9780889779563/trickster-tales-and-the-stories-of-chief-thunderchild/",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
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
