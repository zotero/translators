{
	"translatorID": "908c1ca2-59b6-4ad8-b026-709b7b927bda",
	"label": "SAGE Journals",
	"creator": "Sebastian Karcher",
	"target": "^https?://journals\\.sagepub\\.com(/doi/((abs|full|pdf)/)?10\\.|/action/doSearch\\?|/toc/)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
<<<<<<< HEAD
	"lastUpdated": "2021-11-19 16:13:02"
=======
	"lastUpdated": "2020-12-06 18:57:06"
>>>>>>> f5e2d3d022c2c9586c651208e299837eda137467
}

/*
	***** BEGIN LICENSE BLOCK *****
	Copyright © 2016 Philipp Zumstein
	Modiefied 2020 Timotheus Kim
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

// SAGE uses Atypon, but as of now this is too distinct from any existing Atypon sites to make sense in the same translator.

// attr()/text() v2
// eslint-disable-next-line
function attr(docOrElem,selector,attr,index){var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector);return elem?elem.getAttribute(attr):null;}function text(docOrElem,selector,index){var elem=index?docOrElem.querySelectorAll(selector).item(index):docOrElem.querySelector(selector);return elem?elem.textContent:null;}

function detectWeb(doc, url) {
<<<<<<< HEAD
	if (url.includes('/abs/10.') || url.includes('/full/10.') || url.includes('/pdf/10.') || url.includes('/doi/10.')) {
=======
	let articleMatch = /(abs|full|pdf|doi)\/10\./;
	if (articleMatch.test(url)) {
>>>>>>> f5e2d3d022c2c9586c651208e299837eda137467
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
<<<<<<< HEAD
	let rows = ZU.xpath(doc, '//span[contains(@class, "art_title")]/a[contains(@href, "/doi/full/10.") or contains(@href, "/doi/abs/10.") or contains(@href, "/doi/pdf/10.")][1] | //a[contains(concat( " ", @class, " " ), concat( " ", "ref", " " )) and contains(concat( " ", @class, " " ), concat( " ", "nowrap", " " ))] | //*[contains(concat( " ", @class, " " ), concat( " ", "hlFld-Title", " " ))]');
=======
	var rows = ZU.xpath(doc, '//*[contains(@class, "art_title")]/a[contains(@href, "/doi/full/10.") or contains(@href, "/doi/abs/10.") or contains(@href, "/doi/pdf/10.")][1]');
>>>>>>> f5e2d3d022c2c9586c651208e299837eda137467
	for (var i = 0; i < rows.length; i++) {
		var href = rows[i].href;
		var title = ZU.trimInternal(rows[i].textContent.replace(/Citation|ePub.*|Abstract/, ''));
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		href = href.replace("/doi/pdf/", "/doi/abs/");
		items[href] = title;
	}
	return found ? items : false;
}


function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (!items) {
				return;
			}
			var articles = [];
			for (var i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, scrape);
		});
	}
	else {
		scrape(doc, url);
	}
}


function scrape(doc, url) {
	var risURL = "//journals.sagepub.com/action/downloadCitation";
	var doi = ZU.xpathText(doc, '//meta[@name="dc.Identifier" and @scheme="doi"]/@content');
	if (!doi) {
		doi = url.match(/10\.[^?#]+/)[0];
	}
	var post = "doi=" + encodeURIComponent(doi) + "&include=abs&format=ris&direct=false&submit=Download+Citation";
	var pdfurl = "//" + doc.location.host + "/doi/pdf/" + doi;
<<<<<<< HEAD
	var articleType = ZU.xpath(doc, '//span[@class="ArticleType"]/span');
	//Z.debug(pdfurl);
	//Z.debug(post);
=======
	var tags = doc.querySelectorAll('div.abstractKeywords a');
	// Z.debug(pdfurl);
	// Z.debug(post);
>>>>>>> f5e2d3d022c2c9586c651208e299837eda137467
	ZU.doPost(risURL, post, function (text) {
		//The publication date is saved in DA and the date first
		//appeared online is in Y1. Thus, we want to prefer DA over T1
		//and will therefore simply delete the later in cases both
		//dates are present.
		//Z.debug(text);
		if (text.includes("DA  - ")) {
			text = text.replace(/Y1\s{2}- .*\r?\n/, '');
		}

		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
		translator.setString(text);
		translator.setHandler("itemDone", function (obj, item) {
			// The subtitle will be neglected in RIS and is only present in
			// the website itself. Moreover, there can be problems with
			// encodings of apostrophs.
			var subtitle = ZU.xpathText(doc, '//div[contains(@class, "publicationContentSubTitle")]/h1');
			var title = ZU.xpathText(doc, '//div[contains(@class, "publicationContentTitle")]/h1');
			if (title) {
				item.title = title.trim();
				if (subtitle) {
					item.title += ': ' + subtitle.trim();
				}
			}
			//if author name include "(Translator)" change creatorType and delete "(Translator" from lastName e.g. https://journals.sagepub.com/doi/full/10.1177/0040573620947051
			for (let i in item.creators) {
				let translator = item.creators[i].lastName;
				if (item.creators[i].lastName.match(/\(?Translator\)?/)) {
					item.creators[i].creatorType = "translator";
					item.creators[i].lastName = item.creators[i].lastName.replace('(Translator)', '');
				}
			}
			//scrape ORCID from website e.g. https://journals.sagepub.com/doi/full/10.1177/0084672419883339
			let authorSectionEntries = doc.querySelectorAll('.author-section-div');
			for (let authorSectionEntry of authorSectionEntries) {
				let entryHTML = authorSectionEntry.innerHTML;
				let regexOrcid = /\d+-\d+-\d+-\d+x?/i;
				let regexName = /author=.*"/;
				if(entryHTML.match(regexOrcid)) {
					item.notes.push({note: "orcid:" + entryHTML.match(regexOrcid)[0] + ' | ' + entryHTML.match(regexName)[0].replace('\"', '').replace('author=', '')});
				}
			}
			
			//scrape ORCID at the bottom of text and split firstName and lastName for deduplicate notes. E.g. most of cases by reviews https://journals.sagepub.com/doi/10.1177/15423050211028189
			let ReviewAuthorSectionEntries = doc.querySelectorAll('.NLM_fn p');
			for (let ReviewAuthorSectionEntry of ReviewAuthorSectionEntries) {
				let entryInnerText = ReviewAuthorSectionEntry.innerText;
				let regexOrcid = /\d+-\d+-\d+-\d+x?/i;
				if(entryInnerText.match(regexOrcid) && entryInnerText.split('\n')[1] != undefined) {
					let authorEntry = entryInnerText.split('\n')[1].replace(/https:\/\/.*/, '');
					let fullName = entryInnerText.match(authorEntry)[0].replace('\"', '').trim();Z.debug(fullName)
					let	firstName = fullName.split(' ').slice(0, -1).join(' ');
					let	lastName = fullName.split(' ').slice(-1).join(' ');
					item.notes.push({note: "orcid:" + entryInnerText.match(regexOrcid)[0] + ' | ' + lastName + ', ' + firstName});
				}				
			}
			 
			// Workaround to address address weird incorrect multiple extraction by both querySelectorAll and xpath
			// So, let's deduplicate...
			item.notes = Array.from(new Set(item.notes.map(JSON.stringify))).map(JSON.parse);
			// ubtue: extract translated and other abstracts from the different xpath
			var ubtueabstract = ZU.xpathText(doc, '//*[contains(concat( " ", @class, " " ), concat( " ", "abstractInFull", " " ))]');
			var otherabstract = ZU.xpathText(doc, '//article//div[contains(@class, "tabs-translated-abstract")]/p');
			var abstract = ZU.xpathText(doc, '//article//div[contains(@class, "abstractSection")]/p');
			if (abstract) {
				item.abstractNote = abstract;
			}
<<<<<<< HEAD
			if (otherabstract) {
				item.notes.push({note: "abs:" + otherabstract.replace(/^Résumé/, '')});
			} else {
				item.abstractNote = ubtueabstract;
			}			

			var tagentry = ZU.xpathText(doc, '//kwd-group[1] | //*[contains(concat( " ", @class, " " ), concat( " ", "hlFld-KeywordText", " " ))]');
			if (tagentry) {
				item.tags = tagentry.replace(/.*Keywords/, ',').replace(/Mots-clés/, ',').split(",");
			}
			// ubtue: add tags "Book Review" if ""Book Review"
			if (articleType) {
				for (let r of articleType) {
					var reviewDOIlink = r.innerHTML;
					if (reviewDOIlink.match(/(product|book)\s+reviews?/i)) {
						item.tags.push('Book Review');
					} else if (reviewDOIlink.match(/article\s+commentary|review\s+article/i)) { //"Review article", "Article commentary" as Keywords
						item.tags.push(reviewDOIlink)
					}
				}
			}
			//ubtue: add tag "Book Review" in every issue 5 of specific journals if the dc.Type is "others"
			let reviewType = ZU.xpathText(doc, '//meta[@name="dc.Type"]/@content');
			if (item.ISSN === '0142-064X' || item.ISSN === '0309-0892') {
				if (reviewType && reviewType.match(/other/i) && item.issue === '5') {
					item.tags.push('Book Review');
					item.notes.push({note: "Booklist:" + item.date.match(/\d{4}$/)});
					if (item.abstractNote && item.abstractNote.match(/,(?!\s\w)/g)) {
						item.abstractNote = '';	
					}
				}
			}	
			// numbering issues with slash, e.g. in case of  double issue "1-2" > "1/2"
			if (item.issue) item.issue = item.issue.replace('-', '/');

=======
			
			
			for (let tag of tags) {
				item.tags.push(tag.textContent);
			}
>>>>>>> f5e2d3d022c2c9586c651208e299837eda137467
			// Workaround while Sage hopefully fixes RIS for authors
			for (let i = 0; i < item.creators.length; i++) {
				if (!item.creators[i].firstName) {
					let type = item.creators[i].creatorType;
					let comma = item.creators[i].lastName.includes(",");
					item.creators[i] = ZU.cleanAuthor(item.creators[i].lastName, type, comma);
				}
			}
			// scrape tags
			if (!item.tags || item.tags.length === 0) {
				var embedded = ZU.xpathText(doc, '//meta[@name="keywords"]/@content');
				if (embedded) item.tags = embedded.split(",");
				if (!item.tags) {
					var tags = ZU.xpath(doc, '//div[@class="abstractKeywords"]//a');
					if (tags) item.tags = tags.map(n => n.textContent);
				}
			}
			// mark articles as "LF" (MARC=856 |z|kostenfrei), that are published as open access
			let accessIcon = doc.querySelector('.accessIcon[alt]');
			if (accessIcon && accessIcon.alt.match(/open\s+access/gi)) item.notes.push({note: 'LF:'});
			
			item.language = ZU.xpathText(doc, '//meta[@name="dc.Language"]/@content');
			item.attachments.push({
				url: pdfurl,
				title: "SAGE PDF Full Text",
				mimeType: "application/pdf"
			});
			item.complete();
		});
		translator.translate();
	});
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://journals.sagepub.com/doi/full/10.1177/0040573620918177",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Who Is Saved?",
				"creators": [
					{
						"lastName": "Duff",
						"firstName": "Nancy J.",
						"creatorType": "author"
					}
				],
				"date": "July 1, 2020",
				"DOI": "10.1177/0040573620918177",
				"ISSN": "0040-5736",
				"issue": "2",
				"journalAbbreviation": "Theology Today",
				"language": "en",
				"libraryCatalog": "SAGE Journals",
				"pages": "210-217",
				"publicationTitle": "Theology Today",
				"url": "https://doi.org/10.1177/0040573620918177",
				"volume": "77",
				"attachments": [
					{
						"title": "SAGE PDF Full Text",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Article Commentary"
					}
				],
				"notes": [
					{
						"note": "<p>doi: 10.1177/0040573620918177</p>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://journals.sagepub.com/doi/full/10.1177/0040573619865711",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Reformed Sacramentality",
				"creators": [
					{
						"lastName": "Galbreath",
						"firstName": "Paul",
						"creatorType": "author"
					}
				],
				"date": "October 1, 2019",
				"DOI": "10.1177/0040573619865711",
				"ISSN": "0040-5736",
				"issue": "3",
				"journalAbbreviation": "Theology Today",
				"language": "en",
				"libraryCatalog": "SAGE Journals",
				"pages": "261-265",
				"publicationTitle": "Theology Today",
				"url": "https://doi.org/10.1177/0040573619865711",
				"volume": "76",
				"attachments": [
					{
						"title": "SAGE PDF Full Text",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Review Article"
					}
				],
				"notes": [
					{
						"note": "<p>doi: 10.1177/0040573619865711</p>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://journals.sagepub.com/doi/full/10.1177/0040573619826522",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "The Myth of Rebellious Angels: Studies in Second Temple Judaism and the New Testament Texts by Loren T. Stuckenbruck",
				"creators": [
					{
						"lastName": "Wold",
						"firstName": "Benjamin",
						"creatorType": "author"
					}
				],
				"date": "April 1, 2019",
				"DOI": "10.1177/0040573619826522",
				"ISSN": "0040-5736",
				"issue": "1",
				"journalAbbreviation": "Theology Today",
				"language": "en",
				"libraryCatalog": "SAGE Journals",
				"pages": "83-84",
				"publicationTitle": "Theology Today",
				"shortTitle": "The Myth of Rebellious Angels",
				"url": "https://doi.org/10.1177/0040573619826522",
				"volume": "76",
				"attachments": [
					{
						"title": "SAGE PDF Full Text",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": "Book Review"
					}
				],
				"notes": [
					{
						"note": "<p>doi: 10.1177/0040573619826522</p>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
<<<<<<< HEAD
		"url": "https://journals.sagepub.com/doi/full/10.1177/0969733020929062",
=======
		"url": "https://journals.sagepub.com/doi/full/10.1177/0954408914525387",
>>>>>>> f5e2d3d022c2c9586c651208e299837eda137467
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Nurses’ refusals of patient involvement in their own palliative care",
				"creators": [
					{
<<<<<<< HEAD
						"lastName": "Glasdam",
						"firstName": "Stinne",
						"creatorType": "author"
					},
					{
						"lastName": "Jacobsen",
						"firstName": "Charlotte Bredahl",
						"creatorType": "author"
					},
					{
						"lastName": "Boelsbjerg",
						"firstName": "Hanne Bess",
=======
						"lastName": "Berry",
						"firstName": "RJ",
>>>>>>> f5e2d3d022c2c9586c651208e299837eda137467
						"creatorType": "author"
					}
				],
				"date": "December 1, 2020",
				"DOI": "10.1177/0969733020929062",
				"ISSN": "0969-7330",
				"abstractNote": "Background:Ideas of patient involvement are related to notions of self-determination and autonomy, which are not always in alignment with complex interactions and communication in clinical practice.Aim:To illuminate and discuss patient involvement in routine clinical care situations in nursing practice from an ethical perspective.Method:A case study based on an anthropological field study among patients with advanced cancer in Denmark.Ethical considerations:Followed the principles of the Helsinki Declaration.Findings:Two cases illustrated situations where nurses refused patient involvement in their own case.Discussion:Focus on two ethical issues, namely ‘including patients’ experiences in palliative nursing care’ and ‘relational distribution of power and knowledge’, inspired primarily by Hannah Arendt’s concept of thoughtlessness and a Foucauldian perspective on the medical clinic and power. The article discusses how patients’ palliative care needs and preferences, knowledge and statements become part of the less significant background of nursing practice, when nurses have a predefined agenda for acting with and involvement of patients. Both structurally conditioned ‘thoughtlessness’ of the nurses and distribution of power and knowledge between patients and nurses condition nurses to set the agenda and assess when and at what level it is relevant to take up patients’ invitations to involve them in their own case.Conclusion:The medical and institutional logic of the healthcare service sets the framework for the exchange between professional and patient, which has an embedded risk that ‘thoughtlessness’ appears among nurses. The consequences of neglecting the spontaneous nature of human action and refusing the invitations of the patients to be involved in their life situation call for ethical and practical reflection among nurses. The conditions for interaction with humans as unpredictable and variable challenge nurses’ ways of being ethically attentive to ensure that patients receive good palliative care, despite the structurally conditioned logic of healthcare.",
				"issue": "8",
				"journalAbbreviation": "Nurs Ethics",
				"language": "en",
				"libraryCatalog": "SAGE Journals",
				"pages": "1618-1630",
				"publicationTitle": "Nursing Ethics",
				"url": "https://doi.org/10.1177/0969733020929062",
				"volume": "27",
				"attachments": [
					{
						"title": "SAGE PDF Full Text",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": " Patient involvement"
					},
					{
						"tag": " nurse refusals"
					},
					{
						"tag": " palliative care"
					},
					{
						"tag": " power"
					},
					{
						"tag": " thoughtlessness"
					}
				],
				"notes": [
					{
						"note": "<p>doi: 10.1177/0969733020929062</p>"
					},
					{
<<<<<<< HEAD
						"note": "orcid:0000-0002-0893-3054 | Glasdam, Stinne"
					},
					{
						"note": "LF:"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://journals.sagepub.com/doi/full/10.1177/0037768620920172",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Bridging sociology of religion to transition to adulthood: The emerging role of religion in young adults’ lives",
				"creators": [
					{
						"lastName": "Jung",
						"firstName": "Gowoon",
						"creatorType": "author"
					},
					{
						"lastName": "Park",
						"firstName": "Hyunjoon",
=======
						"lastName": "Bradley",
						"firstName": "MSA",
						"creatorType": "author"
					},
					{
						"lastName": "McGregor",
						"firstName": "RG",
>>>>>>> f5e2d3d022c2c9586c651208e299837eda137467
						"creatorType": "author"
					}
				],
				"date": "September 1, 2020",
				"DOI": "10.1177/0037768620920172",
				"ISSN": "0037-7686",
				"abstractNote": "The sociology of religion has not systematically explored the emerging roles of religion in the whole process of the transition to adulthood, especially in the changing contexts of delayed and complicated transitions to adulthood. Seeking to bridge the two different fields of sociology, we identify four directions of research: (1) a multidimensional approach that identifies the different dimensions of religion with varying degrees of relationship to young adults’ lives; (2) a close attention to racial/ethnic variation in the roles of religion for the transition to adulthood; (3) an open inquiry into the changing importance of religion for young adults in a rapidly shifting neoliberal global economy; and (4) the detrimental effects of religion in the transition to adulthood. We call for more research on the increasingly complex relationship between religion and the transition to adulthood.",
				"issue": "3",
<<<<<<< HEAD
				"journalAbbreviation": "Social Compass",
=======
				"journalAbbreviation": "Proceedings of the Institution of Mechanical Engineers, Part E: Journal of Process Mechanical Engineering",
>>>>>>> f5e2d3d022c2c9586c651208e299837eda137467
				"language": "en",
				"libraryCatalog": "SAGE Journals",
				"pages": "428-443",
				"publicationTitle": "Social Compass",
				"shortTitle": "Bridging sociology of religion to transition to adulthood",
				"url": "https://doi.org/10.1177/0037768620920172",
				"volume": "67",
				"attachments": [
					{
						"title": "SAGE PDF Full Text",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
<<<<<<< HEAD
						"tag": " minority"
					},
					{
						"tag": " minorité"
					},
					{
						"tag": " neoliberalism"
					},
					{
						"tag": " néolibéralisme"
					},
					{
						"tag": " race and ethnicity"
					},
					{
						"tag": " race et ethnicité"
					},
					{
						"tag": " religion"
					},
					{
						"tag": " religion"
					},
					{
						"tag": " transition to adulthood"
					},
					{
						"tag": " transition vers l’âge adulte"
					},
					{
						"tag": " young adults"
					},
					{
						"tag": "jeunes adultes"
					}
				],
				"notes": [
					{
						"note": "<p>doi: 10.1177/0037768620920172</p>"
					},
					{
						"note": "abs:La littérature n’a accordé que peu d’attention à la religion en tant que force sociale affectant les transitions des rôles sociaux des jeunes et leurs perceptions subjectives de l’âge adulte. La sociologie de la religion n’a pas systématiquement exploré les rôles émergents de la religion dans des contextes changeants de transitions retardées et compliquées vers l’âge adulte. En cherchant à rapprocher les deux domaines différents de la sociologie, nous identifions quatre directions de recherches : (1) une approche multidimensionnelle de la religion qui identifie différentes dimensions de la religion avec des degrés variables de relation avec la vie des jeunes adultes ; (2) une attention particulière aux variations raciales/ethniques dans les rôles de la religion dans la transition vers l’âge adulte ; (3) une enquête ouverte sur l’évolution de l’importance de la religion pour les jeunes adultes dans une économie mondiale néolibérale en mutation rapide ; et (4) les effets néfastes de la religion dans la transition vers l’âge adulte. Nous appelons à davantage de recherches sur la relation de plus en plus complexe entre la religion et la transition vers l’âge adulte."
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://journals.sagepub.com/doi/full/10.1177/0146107920958985",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "“The Land Is Mine” (Leviticus 25:23): Reimagining the Jubilee in the Context of the Palestinian-Israeli Conflict",
				"creators": [
					{
						"lastName": "Joseph",
						"firstName": "Simon J.",
						"creatorType": "author"
					}
				],
				"date": "November 1, 2020",
				"DOI": "10.1177/0146107920958985",
				"ISSN": "0146-1079",
				"abstractNote": "The Jubilee tradition commemorates the release of slaves, the remission of debt, and the repatriation of property, a “day” of physical and spiritual restoration. The Jubilee tradition—originating in a constitutional vision of ancient Israel periodically restoring its ancestral sovereignty as custodians of the land—became a master symbol of biblical theology, a powerful ideological resource as well as a promise of a divinely realized future during the Second Temple period, when the Qumran community envisioned an eschatological Jubilee and the early Jesus tradition remembered Jesus’ nonviolence in Jubilee-terms. Jubilee themes can also be identified in ideals inscribed in the founding of America, the Abolition movement, the Women’s Liberation Movement, the Civil Rights movement, and Liberation Theology. This study seeks to extend the exploration of Jubilee themes by adopting a comparative methodological approach, re-examining Jubilee themes in the context of the contemporary Palestinian-Israeli conflict, where the dream of Peace in the Middle East continues to play out in predominantly politicized contexts.",
				"issue": "4",
				"journalAbbreviation": "Biblical Theology Bulletin",
				"language": "en",
				"libraryCatalog": "SAGE Journals",
				"pages": "180-190",
				"publicationTitle": "Biblical Theology Bulletin",
				"shortTitle": "“The Land Is Mine” (Leviticus 25",
				"url": "https://doi.org/10.1177/0146107920958985",
				"volume": "50",
				"attachments": [
					{
						"title": "SAGE PDF Full Text",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": " Jubilee Year"
					},
					{
						"tag": " Liberation"
					},
					{
						"tag": " Palestinian/Israeli Conflict"
					},
					{
						"tag": " Peace & Nonviolence"
					}
				],
				"notes": [
					{
						"note": "<p>doi: 10.1177/0146107920958985</p>"
=======
						"tag": "BCR limestone powder (CRM-116)"
					},
					{
						"tag": "Brookfield powder flow tester"
					},
					{
						"tag": "Jenike shear cell"
					},
					{
						"tag": "Schulze ring shear tester"
					},
					{
						"tag": "Shear cell"
					},
					{
						"tag": "characterizing powder flowability"
					},
					{
						"tag": "flow function"
					},
					{
						"tag": "reproducibility"
>>>>>>> f5e2d3d022c2c9586c651208e299837eda137467
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://journals.sagepub.com/doi/full/10.1177/0040573620947051",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "My Friend Johann Baptist Metz",
				"creators": [
					{
						"lastName": "Moltmann",
						"firstName": "Jürgen",
						"creatorType": "author"
					},
					{
						"lastName": "Lösel ",
						"firstName": "Steffen",
						"creatorType": "translator"
					}
				],
				"date": "October 1, 2020",
				"DOI": "10.1177/0040573620947051",
				"ISSN": "0040-5736",
				"abstractNote": "Johann Baptist Metz died on December 2, 2019. He and Jürgen Moltmann shared a theological and personal friendship marked by affection and respect. It was an honest friendship and it lasted for over fifty years. It started when two texts met: Metz’s essay “God before Us” and Moltmann’s essay “The Category of Novum in Christian Theology.” Both were published in the volume To Honor Ernst Bloch (1965). This article is a personal reminiscence.",
				"issue": "3",
				"journalAbbreviation": "Theology Today",
				"language": "en",
				"libraryCatalog": "SAGE Journals",
				"pages": "310-312",
				"publicationTitle": "Theology Today",
				"url": "https://doi.org/10.1177/0040573620947051",
				"volume": "77",
				"attachments": [
					{
						"title": "SAGE PDF Full Text",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": " Catholic"
					},
					{
						"tag": " Johann Baptist Metz"
					},
					{
						"tag": " eulogy"
					},
					{
						"tag": " memory"
					},
					{
						"tag": " political theology"
					}
				],
				"notes": [
					{
						"note": "<p>doi: 10.1177/0040573620947051</p>"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
<<<<<<< HEAD
		"url": "https://journals.sagepub.com/doi/full/10.1177/0084672420926259",
=======
		"url": "https://journals.sagepub.com/doi/full/10.1177/1541204015581389",
>>>>>>> f5e2d3d022c2c9586c651208e299837eda137467
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Which psychology(ies) serves us best? Research perspectives on the psycho-cultural interface in the psychology of religion(s)",
				"creators": [
					{
<<<<<<< HEAD
						"lastName": "Anczyk",
						"firstName": "Adam",
						"creatorType": "author"
					},
					{
						"lastName": "Grzymała-Moszczyńska",
						"firstName": "Halina",
						"creatorType": "author"
					},
					{
						"lastName": "Krzysztof-Świderska",
						"firstName": "Agnieszka",
						"creatorType": "author"
					},
					{
						"lastName": "Prusak",
						"firstName": "Jacek",
						"creatorType": "author"
					}
				],
				"date": "November 1, 2020",
				"DOI": "10.1177/0084672420926259",
				"ISSN": "0084-6724",
				"abstractNote": "The article concentrates on answering the main question to be addressed, as stated in its title: which psychology(ies) serves us best? In order to achieve this goal, we pursue possible answers in history of psychology of religion and its interdisciplinary relationships with its sister disciplines, anthropology of religion and religious studies, resulting with sketching a typology of the main attitudes towards conceptualising psycho-cultural interface, prevalent among psychologists: the Universalist, the Absolutist and the Relativist stances. Next chosen examples from the field of applied psychology are presented, as the role of the cultural factor within the history of Diagnostic and Statistical Manual of Mental Disorders’ (DSM) development is discussed alongside presenting research on the phenomenon of ‘hearing voices’, in order to show the marked way for the future – the importance of including the cultural factor in psychological research on religion.",
				"issue": "3",
				"journalAbbreviation": "Archive for the Psychology of Religion",
=======
						"lastName": "Petkovsek",
						"firstName": "Melissa A.",
						"creatorType": "author"
					},
					{
						"lastName": "Boutwell",
						"firstName": "Brian B.",
						"creatorType": "author"
					},
					{
						"lastName": "Barnes",
						"firstName": "J. C.",
						"creatorType": "author"
					},
					{
						"lastName": "Beaver",
						"firstName": "Kevin M.",
						"creatorType": "author"
					}
				],
				"date": "October 1, 2016",
				"DOI": "10.1177/1541204015581389",
				"ISSN": "1541-2040",
				"abstractNote": "Moffitt’s taxonomy remains an influential theoretical framework within criminology. Despite much empirical scrutiny, comparatively less time has been spent testing the snares component of Moffitt’s work. Specifically, are there factors that might engender continued criminal involvement for individuals otherwise likely to desist? The current study tested whether gang membership increased the odds of contact with the justice system for each of the offender groups specified in Moffitt’s original developmental taxonomy. Our findings provided little evidence that gang membership increased the odds of either adolescence-limited or life-course persistent offenders being processed through the criminal justice system. Moving forward, scholars may wish to shift attention to alternative variables—beyond gang membership—when testing the snares hypothesis.",
				"issue": "4",
				"journalAbbreviation": "Youth Violence and Juvenile Justice",
>>>>>>> f5e2d3d022c2c9586c651208e299837eda137467
				"language": "en",
				"libraryCatalog": "SAGE Journals",
				"pages": "295-316",
				"publicationTitle": "Archive for the Psychology of Religion",
				"shortTitle": "Which psychology(ies) serves us best?",
				"url": "https://doi.org/10.1177/0084672420926259",
				"volume": "42",
				"attachments": [
					{
						"title": "SAGE PDF Full Text",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
						"tag": " Cross-cultural research"
					},
					{
						"tag": " cultural psychology"
					},
					{
						"tag": " history"
					},
					{
						"tag": " methodology"
					},
					{
						"tag": " multicultural issues"
					},
					{
						"tag": " religion"
					}
				],
				"notes": [
					{
						"note": "<p>doi: 10.1177/0084672420926259</p>"
					},
					{
<<<<<<< HEAD
						"note": "orcid:0000-0001-6906-3104 | Anczyk, Adam"
					},
					{
						"note": "orcid:0000-0003-2751-3204 | Grzymała-Moszczyńska, Halina"
					}
				],
=======
						"tag": "delinquency"
					},
					{
						"tag": "gang membership"
					},
					{
						"tag": "snares"
					}
				],
				"notes": [],
>>>>>>> f5e2d3d022c2c9586c651208e299837eda137467
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
<<<<<<< HEAD
		"url": "https://journals.sagepub.com/doi/10.1177/15423050211028189",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Mitchell, Kenneth R., All Our Losses, All Our Griefs: Resources for Pastoral Care",
				"creators": [
					{
						"lastName": "Johnson Brand",
						"firstName": "Emi Alisa",
						"creatorType": "author"
					}
				],
				"date": "September 1, 2021",
				"DOI": "10.1177/15423050211028189",
				"ISSN": "1542-3050",
				"issue": "3",
				"journalAbbreviation": "J Pastoral Care Counsel",
				"language": "en",
				"libraryCatalog": "SAGE Journals",
				"pages": "229-230",
				"publicationTitle": "Journal of Pastoral Care & Counseling",
				"shortTitle": "Mitchell, Kenneth R., All Our Losses, All Our Griefs",
				"url": "https://doi.org/10.1177/15423050211028189",
				"volume": "75",
=======
		"url": "https://journals.sagepub.com/doi/10.1177/0263276404046059",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "The ‘System’ of Automobility",
				"creators": [
					{
						"lastName": "Urry",
						"firstName": "John",
						"creatorType": "author"
					}
				],
				"date": "October 1, 2004",
				"DOI": "10.1177/0263276404046059",
				"ISSN": "0263-2764",
				"abstractNote": "This article is concerned with how to conceptualize and theorize the nature of the ‘car system’ that is a particularly key, if surprisingly neglected, element in ‘globalization’. The article deploys the notion of systems as self-reproducing or autopoietic. This notion is used to understand the origins of the 20th-century car system and especially how its awesome pattern of path dependency was established and exerted a particularly powerful and self-expanding pattern of domination across the globe. The article further considers whether and how the 20th-century car system may be transcended. It elaborates a number of small changes that are now occurring in various test sites, factories, ITC sites, cities and societies. The article briefly considers whether these small changes may in their contingent ordering end this current car system. The article assesses whether such a new system could emerge well before the end of this century, whether in other words some small changes now may produce the very large effect of a new post-car system that would have great implications for urban life, for mobility and for limiting projected climate change.",
				"issue": "4-5",
				"journalAbbreviation": "Theory, Culture & Society",
				"language": "en",
				"libraryCatalog": "SAGE Journals",
				"pages": "25-39",
				"publicationTitle": "Theory, Culture & Society",
				"url": "https://doi.org/10.1177/0263276404046059",
				"volume": "21",
>>>>>>> f5e2d3d022c2c9586c651208e299837eda137467
				"attachments": [
					{
						"title": "SAGE PDF Full Text",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					{
<<<<<<< HEAD
						"tag": "Book Review"
					}
				],
				"notes": [
					{
						"note": "<p>doi: 10.1177/15423050211028189</p>"
					},
					{
						"note": "orcid:0000-0002-5423-3796 | Brand, Emi Alisa Johnson"
=======
						"tag": "automobility"
					},
					{
						"tag": "path dependence"
					},
					{
						"tag": "technology"
					},
					{
						"tag": "time-space"
					},
					{
						"tag": "tipping point"
>>>>>>> f5e2d3d022c2c9586c651208e299837eda137467
					}
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
