{
	"translatorID": "f9cd4307-22b5-4d53-b37b-117a029729f5",
	"label": "ubtue_Peeters",
	"creator": "Timotheus Kim",
	"target": "^https?://(www\\.)?poj\\.peeters-leuven\\.be/content\\.php",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 99,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-11-15 09:17:41"
}

/*
	***** BEGIN LICENSE BLOCK *****
	Copyright © 2018 Timotheus Chang-Whae Kim, Johannes Ruscheinski, Philipp Zumstein
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


// attr()/text() v2
function attr(docOrElem, selector, attr, index) { var elem = index ? docOrElem.querySelectorAll(selector).item(index) : docOrElem.querySelector(selector); return elem ? elem.getAttribute(attr) : null; } function text(docOrElem, selector, index) { var elem = index ? docOrElem.querySelectorAll(selector).item(index) : docOrElem.querySelector(selector); return elem ? elem.textContent : null; }


function detectWeb(doc, url) {
	if (url.includes('url=article')) {
		return "journalArticle";
	} else if (url.includes('url=issue') && getSearchResults(doc, true)) {
		return "multiple";
	}
}


function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('tr');
	for (let i = 0; i < rows.length; i++) {
		let href = attr(rows[i], 'td a', 'href');
		let title = text(rows[i], 'td', 1);
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
			if (!items) {
				return true;
			}
			var articles = [];
			for (var i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, scrape);
		});
	} else {
		scrape(doc, url);
	}
}


function ALLCaps(name) {
	return name === name.toUpperCase();
}


// Concatenate the values of all nodes until a BR or B tag respecting the HTML formatting
function getValue(nodes) {
	var value = "";
	for (let part of nodes) {
		if (part.tagName == "BR" || part.tagName == "B") break;
		value += ' ';
		if (part.tagName) {
			value += part.outerHTML;
		} else {
			value += part.textContent.trim();
		}
	}
	return value;
}

function parseAbstract(doc, item) {
	// the abstract text can be interspersed by inline <i> tags that break
	// the flow of text. So, we need to iterate through the text nodes and
	// <i> nodes in sequence
	let textParts = ZU.xpath(doc, '//b[contains(text(), "Abstract :")]/following-sibling::text()');
	let italicsParts = ZU.xpath(doc, '//b[contains(text(), "Abstract :")]/following-sibling::i');

	if (textParts && textParts.length > 0) {
		item.abstractNote = "";

		let fullAbstract = "";
		let i = 0, j = 0;
		do {
			let text = textParts[i].textContent;
			if (text && text.length > 0)
				fullAbstract += text;

			if (j < italicsParts.length) {
				let text = italicsParts[j].textContent;
				if (text && text.length > 0)
					fullAbstract += text;
				++j;
			}

			++i;
		} while (i < textParts.length);
		//split abstracts
		let multipleAbstractList = fullAbstract.split(/\.(\n\n)/g).filter(arrayItem => arrayItem !== "\n\n");
		item.abstractNote = ZU.trimInternal(multipleAbstractList[0]);
		let absIndex = 0;
		for (let abs of multipleAbstractList.splice(1)) {
				item.notes.push({
					note: "abs"+ (absIndex !== 0 ? absIndex : '') + ":" + ZU.trimInternal(abs),
				});
				++absIndex;
		}
	}
}


function scrape(doc, url) {
	var item = new Z.Item('journalArticle');

	var titleNodes = ZU.xpath(doc, '//b[contains(text(), "Title:")]/following-sibling::node()');
	item.title = getValue(titleNodes).replace(/<[^>]*>/g, "");
	var subtitleNodes = ZU.xpath(doc, '//b[contains(text(), "Subtitle:")]/following-sibling::node()');
	var subtitle = getValue(subtitleNodes);
	if (subtitle) {
		item.title += ': ' + subtitle;
	}

	item.title = ZU.unescapeHTML(item.title.replace(/<(.|\n)*?>/g, ''));

	// e.g. Author(s): HANDAL, Boris , WATSON, Kevin , ..., VAN DER MERWE, W.L.
	// but sometimes the space before the comma is also missing
	var authors = ZU.xpathText(doc, '//b[contains(text(), "Author(s):")]/following-sibling::text()[1]');
	if (authors) {
		authors = authors.split(',');
	}
	var creator;
	for (let i = 0; i < authors.length; i++) {
		let name = authors[i];
		if (ALLCaps(name)) name = ZU.capitalizeTitle(name, true);
		if (i % 2 === 0) {// last name
			creator = {
				creatorType: 'author',
				lastName: ZU.capitalizeTitle(name, true)
			};
		} else {// first name
			creator.firstName = name;
			item.creators.push(creator);
		}
	}

	item.publicationTitle = ZU.xpathText(doc, '//b[contains(text(), "Journal:")]/following-sibling::a[1]');
	item.volume = ZU.xpathText(doc, '//b[contains(text(), "Volume:")]/following-sibling::a[1]');
	item.issue = ZU.xpathText(doc, '//b[contains(text(), "Issue:")]/following-sibling::text()[1]');
	// numbering issues with slash due to cataloguing rule
	if (item.issue) item.issue = item.issue.replace('-', '/');
	item.date = ZU.xpathText(doc, '//b[contains(text(), "Date:")]/following-sibling::text()[1]');
	item.pages = ZU.xpathText(doc, '//b[contains(text(), "Pages:")]/following-sibling::text()[1]');
	item.DOI = ZU.xpathText(doc, '//b[contains(text(), "DOI:")]/following-sibling::text()[1]');
	item.url = url;

	parseAbstract(doc, item);
	if (item.abstractNote.match(/not\s?available+|^editorial$|^Obituary$/i)) delete item.abstractNote;
	//scrape e-issn from the journal site
	let lookupIssn = doc.querySelectorAll('.whitecell');
	if (lookupIssn && lookupIssn[0]) {
		let post = 'https://poj.peeters-leuven.be/content.php?url=journal.php&journal_code=' + lookupIssn[0].baseURI.split('&journal_code=')[1];
		ZU.processDocuments(post, function (scrapeEissn) {
			var eissn = ZU.xpathText(scrapeEissn, '//td[@class="b2"]');
			if (eissn && eissn.match(/e-issn\s+:?\s+\d{4}-?\d{4}/gi)) {
				item.ISSN = eissn.match(/e-issn\s+:?\s+\d{4}-?\d{4}/gi).toString().trim().replace(/e-issn\s+:?\s/i, '');
			}
			//item.complete();
		});
	}
	// fixup date
	if (item.date) {
		var match = item.date.match(/^numéro [0-9]+, ([0-9]{4})/);
		if (match)
			item.date = match[1];
	}
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://poj.peeters-leuven.be/content.php?url=issue&journal_code=EP&issue=3&vol=24",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://poj.peeters-leuven.be/content.php?url=article&id=3269042&journal_code=EP",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Choosing to be Changed:  Revelation, Identity and the Ethics of Self-Transformation",
				"creators": [
					{
						"creatorType": "author",
						"lastName": "Mcqueen",
						"firstName": " Paddy"
					}
				],
				"date": "2017",
				"DOI": "10.2143/EP.24.4.3269042",
				"abstractNote": "How should one decide whether to undergo an experience that changes who one is? In her discussion of ‘transformative experiences’, L.A. Paul argues that to choose rationally when deliberating first-personally, one should base one’s decision on ‘revelation’, i.e. to discover out what the experience will be like. If this solution is taken as the sole means by which a transformative choice is made, then I argue it is problematic. This is because (i) it overlooks the role that one’s practical identity ought to play when making a major life decision; and (ii) it ignores morally relevant reasons for action. Even if we retain the revelation approach as only part of the means through which a transformative choice is made, I argue that revelation should frequently carry little weight in our decision-making. Rather than focusing on the subjective quality of future experiences, it is often preferable to reflect on who one is and what one’s endorsed practical identity commits one to.",
				"issue": "4",
				"libraryCatalog": "ubtue_Peeters",
				"pages": "545-568",
				"publicationTitle": "Ethical Perspectives",
				"shortTitle": "Choosing to be Changed",
				"url": "https://poj.peeters-leuven.be/content.php?url=article&id=3269042&journal_code=EP",
				"volume": "24",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://poj.peeters-leuven.be/content.php?url=article.php&id=3269043&journal_code=EP",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Recognizing and Emulating Exemplars",
				"creators": [
					{
						"creatorType": "author",
						"lastName": "Compaijen",
						"firstName": " Rob"
					}
				],
				"date": "2017",
				"DOI": "10.2143/EP.24.4.3269043",
				"abstractNote": "In the present contribution I explore what is involved in recognizing and emulating exemplars, and I do so by critically engaging with the view – recently forwarded by Linda T. Zagzebski – that admiration is the key to understanding these issues. While I believe that recognizing exemplars typically involves admiration, I do not think it is sufficient. Instead, I suggest, understanding what is involved in the recognition and emulation of exemplars requires a richer account. I develop my argument in three steps. First, I engage with Zagzebski’s exemplarist moral theory and elaborate her understanding of the relationship between admiration and exemplarity on the basis of her recent work on the topic. Second, I argue why I believe that we cannot understand the recognition and emulation of exemplars by reference to admiration alone. Third, I elaborate my own account of what is involved in recognizing and emulating exemplars, which involves self-awareness, the possibility of identifying with the exemplar, and what I call ‘motivational continuity’.",
				"issue": "4",
				"libraryCatalog": "ubtue_Peeters",
				"pages": "569-593",
				"publicationTitle": "Ethical Perspectives",
				"url": "https://poj.peeters-leuven.be/content.php?url=article.php&id=3269043&journal_code=EP",
				"volume": "24",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://poj.peeters-leuven.be/content.php?url=article.php&id=3269044&journal_code=EP",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Cognitivist Prescriptivism",
				"creators": [
					{
						"creatorType": "author",
						"lastName": "Alwood",
						"firstName": " Andrew H."
					}
				],
				"date": "2017",
				"DOI": "10.2143/EP.24.4.3269044",
				"abstractNote": "Metaethical cognitivism allegedly has trouble explaining how moral judgments are practical, because it claims that moral thoughts are beliefs that need not involve motivation. But motivation is not necessary to meet the practicality criterion on theories of moral thought and talk. A cognitivist about moral thought can adopt a prescriptivist account of moral talk, in a hybrid theory that supplements descriptive moral meanings in order to achieve interesting advantages over traditional descriptivist and expressivist theories as well as over other hybrid theories. This hybrid cognitivist-prescriptivist theory makes sense of amoralists who have moral judgments but no motivation, and offers a new diagnosis of why their use of moral language is infelicitous.",
				"issue": "4",
				"libraryCatalog": "ubtue_Peeters",
				"pages": "595-623",
				"publicationTitle": "Ethical Perspectives",
				"url": "https://poj.peeters-leuven.be/content.php?url=article.php&id=3269044&journal_code=EP",
				"volume": "24",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://poj.peeters-leuven.be/content.php?url=article&id=3127266&journal_code=EP",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "'Thank God I Failed':  How Much Does a Failed Murder Attempt Transform the Agent?",
				"creators": [
					{
						"creatorType": "author",
						"lastName": "Cowley",
						"firstName": " Christopher"
					}
				],
				"date": "2015",
				"DOI": "10.2143/EP.22.4.3127266",
				"abstractNote": "Peter Winch writes: 'One who fails in his attempt to commit a murder and who undergoes a change of heart might subsequently come to thank God that he failed. It is pertinent for us to ask what precisely he has to thank God for' (1971, 144). The first answer to this question is that the thwarted attempter is relieved not to have become a murderer. In exploring the nature of this becoming, I consider and reject a ‘subjectivist’ account, according to which the attempter has already ‘become’ a murderer in virtue of his or her sincerely murderous intentions and plans. And yet clearly the attempter has lost something of the innocence that would make murder morally unthinkable. He or she thereby inhabits a curious kind of metaphysical limbo between innocence and guilt, between transformation and self-discovery, between ignorance and knowledge.",
				"issue": "4",
				"libraryCatalog": "ubtue_Peeters",
				"pages": "523-545",
				"publicationTitle": "Ethical Perspectives",
				"shortTitle": "'Thank God I Failed'",
				"url": "https://poj.peeters-leuven.be/content.php?url=article&id=3127266&journal_code=EP",
				"volume": "22",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://poj.peeters-leuven.be/content.php?url=issue&journal_code=EP&issue=1&vol=1",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://poj.peeters-leuven.be/content.php?url=article&id=630100&journal_code=EP",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "An Ethical Agenda for Europe:  Fundamental Problems on Practical Ethics in a Christian Perspective",
				"creators": [
					{
						"creatorType": "author",
						"lastName": "Verstraeten",
						"firstName": " Johan"
					}
				],
				"date": "March 1994",
				"DOI": "10.2143/EP.1.1.630100",
				"abstractNote": "Today, applied ethics confronts many problems: technological and biomedical innovations, crisis of the welfare state, rising unemployment, migration and xenophobia. These and the changes accompanying them are, in themselves, important objects of study. An investigation on the level of the differentiated disciplines of practical ethics is insufficient. In as far as practical ethics also serves to disclose reality, it shows that modern problems can only be understood in the light of the general cultural crisis of which they are, at the very least, symptoms. In the first part of this article, we will try to clarify this byanalyzing the crisis in the ethos of modern secularized society. The second part will try to show that Christian ethics can offer a meaningful answer to this cultural crisis, and how it can do so.",
				"issue": "1",
				"libraryCatalog": "ubtue_Peeters",
				"pages": "3-12",
				"publicationTitle": "Ethical Perspectives",
				"shortTitle": "An Ethical Agenda for Europe",
				"url": "https://poj.peeters-leuven.be/content.php?url=article&id=630100&journal_code=EP",
				"volume": "1",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://poj.peeters-leuven.be/content.php?url=issue&journal_code=LV&issue=1&vol=73",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://poj.peeters-leuven.be/content.php?url=article&id=3281475&journal_code=LV",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "De Medellín à nos jours:  Quelle place pour la catéchèse en Amérique latine?",
				"creators": [
					{
						"creatorType": "author",
						"lastName": "Jiménez Rodríguez",
						"firstName": " Manuel José"
					}
				],
				"date": "2018",
				"DOI": "10.2143/LV.73.1.3281475",
				"abstractNote": "À Medellín, les raisons qui ont conduit à solliciter un renouveau de la catéchèse restent actuelles. Outre les profondes transformations sociales, culturelles et religieuses qui remettent en question le rôle du christianisme en Amérique latine, il existe la nécessité de ré-évangéliser les baptisés de tous les âges. Ceci demande un nouveau paradigme pour la catéchèse sur le continent qui doit être en rapport avec l’initiation chrétienne, le catéchuménat et l’inspiration catéchuménale de la catéchèse. La dimension sociale du kérygme et l’initiation chrétienne mettent bien en évidence la concordance entre Medellín, la Conférence d’Aparecida et le Magistère du pape François.",
				"issue": "1",
				"libraryCatalog": "ubtue_Peeters",
				"pages": "33-41",
				"publicationTitle": "Lumen Vitae",
				"shortTitle": "De Medellín à nos jours",
				"url": "https://poj.peeters-leuven.be/content.php?url=article&id=3281475&journal_code=LV",
				"volume": "73",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://poj.peeters-leuven.be/content.php?url=article&id=3251316&journal_code=LV",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Laisser la Parole de Dieu faire son travail:  Un défi pour le lecteur des Écritures",
				"creators": [
					{
						"creatorType": "author",
						"lastName": "Raimbault",
						"firstName": " Christophe"
					}
				],
				"date": "2017",
				"DOI": "10.2143/LV.72.4.3251316",
				"abstractNote": "Trop souvent, on parle indistinctement de Bible et de Parole de Dieu. Or, la Bible n’est pas spontanément Parole de Dieu: elle le devient. L’enjeu est important. Dieu se révèle comme Parole incarnée, comme Parole adressée, comme une Bonne Nouvelle qui nous concerne et nous implique. Mais hélas certains textes bibliques ne nous parlent pas. Ils sont trop difficiles, ou trop violents, ou trop rabâchés pour être relus, ou pas lus du tout… Et pourtant, ils font partie de la Bible, dont l’inerrance et la canonicité sont incontestables. Nous trouverons ici quelques pistes pour que, de ces textes, émerge une Parole quand même. En tout état de cause, quel que soit le passage biblique lu et étudié, le lecteur qui s’astreint à une lecture attentive et à un travail sur le texte est assuré que Dieu ne restera pas sans lui parler.",
				"issue": "4",
				"libraryCatalog": "ubtue_Peeters",
				"pages": "371-382",
				"publicationTitle": "Lumen Vitae",
				"shortTitle": "Laisser la Parole de Dieu faire son travail",
				"url": "https://poj.peeters-leuven.be/content.php?url=article&id=3251316&journal_code=LV",
				"volume": "72",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://poj.peeters-leuven.be/content.php?url=article&id=3281483&journal_code=LV",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Mission et œcuménisme: de la concurrence à la collaboration?:  9e Forum bilingue «Fribourg Église dans le monde», Université de Fribourg, les 12-13 octobre 2017",
				"creators": [
					{
						"creatorType": "author",
						"lastName": "Amherdt",
						"firstName": " François-Xavier"
					}
				],
				"date": "2018",
				"DOI": "10.2143/LV.73.1.3281483",
				"issue": "1",
				"libraryCatalog": "ubtue_Peeters",
				"pages": "109-113",
				"publicationTitle": "Lumen Vitae",
				"shortTitle": "Mission et œcuménisme",
				"url": "https://poj.peeters-leuven.be/content.php?url=article&id=3281483&journal_code=LV",
				"volume": "73",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://poj.peeters-leuven.be/content.php?url=article&id=3248537&journal_code=EP",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "HREC Members' Personal Values Influence Decision Making in Contentious Cases",
				"creators": [
					{
						"creatorType": "author",
						"lastName": "Handal",
						"firstName": " Boris "
					},
					{
						"creatorType": "author",
						"lastName": "Watson",
						"firstName": " Kevin "
					},
					{
						"creatorType": "author",
						"lastName": "Brewer",
						"firstName": " Keagan"
					},
					{
						"creatorType": "author",
						"lastName": "Fellman",
						"firstName": " Marc "
					},
					{
						"creatorType": "author",
						"lastName": "Maher",
						"firstName": " Marguerite "
					},
					{
						"creatorType": "author",
						"lastName": "Ianiello",
						"firstName": " Hannah "
					},
					{
						"creatorType": "author",
						"lastName": "White",
						"firstName": " Miya"
					}
				],
				"date": "2017",
				"DOI": "10.2143/EP.24.3.3248537",
				"abstractNote": "This article identifies 14 contentious issues faced by Human Research Ethics Committees (HRECs). The authors argue that HREC members will respond variably to these issues based on their own fundamental values and worldview. In particular, we propose that personal interpretations of current ethics regulations and HREC members’ attitudes to consequentialism, Kantianism, and utilitarianism in some cases affect their responses to contentious research issues. We seek to promote understanding of how personal and professional backgrounds of HREC reviewers influence their approaches to value-laden issues embedded in ethics applications. Taking the form of a literature review, our contribution highlights the need for further exploration of how HREC members make decisions, and what factors influence the outcomes of ethics applications.",
				"issue": "3",
				"libraryCatalog": "ubtue_Peeters",
				"pages": "405-439",
				"publicationTitle": "Ethical Perspectives",
				"url": "https://poj.peeters-leuven.be/content.php?url=article&id=3248537&journal_code=EP",
				"volume": "24",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://poj.peeters-leuven.be/content.php?url=issue&journal_code=EP&issue=3&vol=24",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://poj.peeters-leuven.be/content.php?url=article&id=563038&journal_code=EP",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Philosophy and the Multi-Cultural Context of (Post)Apartheid South Africa",
				"creators": [
					{
						"creatorType": "author",
						"lastName": "Van Der Merwe",
						"firstName": "W.l."
					}
				],
				"date": "July 1996",
				"DOI": "10.2143/EP.3.2.563038",
				"abstractNote": "Umuntu ngumuntu ngabantu is the Zulu version of a traditional African aphorism. Although with considerable loss of culture-specific meaning, it can be translated as: 'A human being is a human being through (the otherness of) other human beings.' Still, its meaning can be interpreted in various ways of which I would like to highlight only two, in accordance with the grammar of the central concept 'Ubuntu' which denotes both a state of being and one of becoming.",
				"issue": "2",
				"libraryCatalog": "ubtue_Peeters",
				"pages": "76-90",
				"publicationTitle": "Ethical Perspectives",
				"url": "https://poj.peeters-leuven.be/content.php?url=article&id=563038&journal_code=EP",
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
		"url": "https://poj.peeters-leuven.be/content.php?url=article&id=3256900&journal_code=BYZ",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "The Unedited Life of St John Chrysostom by Nicetas David the Paphlagonian:  Editio princeps , Part I",
				"creators": [
					{
						"creatorType": "author",
						"lastName": "Antonopoulou",
						"firstName": " Theodora"
					}
				],
				"date": "2017",
				"DOI": "10.2143/BYZ.87.0.3256900",
				"abstractNote": "The paper presents the first ever edition of the first half (chapters 1-28) of the long Life of St John Chrysostom by Nicetas David the Paphlagonian, composed in all probability in the second quarter of the tenth century. This is an important text for a number of reasons, as explained in detail in my introduction to the Life published in Byz, 86 (2016), pp. 1-51. The critical edition is preceded by a study of the unique manuscript and an exposition of the peculiarities of the author’s language as well as of the editorial principles.",
				"libraryCatalog": "ubtue_Peeters",
				"pages": "1-67",
				"publicationTitle": "Byzantion",
				"shortTitle": "The Unedited Life of St John Chrysostom by Nicetas David the Paphlagonian",
				"url": "https://poj.peeters-leuven.be/content.php?url=article&id=3256900&journal_code=BYZ",
				"volume": "87",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://poj.peeters-leuven.be/content.php?url=article&id=3289311&journal_code=ETS",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Eigenverantwortung christlicher Gemeinden in ihrem Gegenüber zur Kirchenleitung:  In memoriam Leo Karrer (1937-2021)",
				"creators": [
					{
						"creatorType": "author",
						"lastName": "Schmid-Keiser",
						"firstName": " Stephan"
					}
				],
				"date": "2021",
				"DOI": "10.2143/ETS.12.1.3289311",
				"abstractNote": "Seelsorgende und ihre Gemeinden stehen untereinander und speziell in ihrem Verhältnis zur Kirchenleitung vor großen Herausforderungen. Dies machen 'Impulse zur Eigenverantwortung der Gemeinden' bewusst, welche Hermann Häring zu Ostern 2020 publizierte. Dessen Kernanliegen fokussieren auf eine partizipative Kirchenstruktur, den Bedarf nach 'mehr Augenhöhe', den Ruf nach Autorität der Gemeinde und deren Kraft aus den Charismen vor Ort. In kritischer Reflexion einiger dieser Stichworte greift Stephan Schmid-Keiser die Anliegen Härings auf. Eigene Erfahrungen in der Leitung von Pfarreien bewegen ihn, Derivate aus der Forschungsarbeit von Thomas Wienhardt (2017) zu einer wirkungsvoll(er)en Pastoral zu diskutieren und zu fragen, inwieweit die praktische Theologie hinsichtlich der Stärkung der Eigenverantwortung von Getauften und Gefirmten bisher das Nötige tut. Schließlich plädiert der Beitrag für Weichenstellungen im Kirchenrecht, ohne die kirchliches Leben in gewandelter Gesellschaft vermehrt ins Abseits geriete. Gewidmet ist der Beitrag Leo Karrer († 8. Januar 2021), dem die Stärkung echter Teilhabe des Volkes Gottes am Leben der Glaubensgemeinschaft ein Grundanliegen war",
				"issue": "1",
				"libraryCatalog": "ubtue_Peeters",
				"pages": "131-148",
				"publicationTitle": "ET-Studies",
				"shortTitle": "Eigenverantwortung christlicher Gemeinden in ihrem Gegenüber zur Kirchenleitung",
				"url": "https://poj.peeters-leuven.be/content.php?url=article&id=3289311&journal_code=ETS",
				"volume": "12",
				"attachments": [],
				"tags": [],
				"notes": [
					{
						"note": "abs:Pastors and their congregations face great challenges among themselves and especially in their relationship with the church leadership. This is made clear in 'Impulses towards Congregations assuming Personal Responsibility' that Hermann Häring published at Easter 2020. Its core concerns focus on a participatory church structure, the need for more eye-to-eye interaction, the call for authority to be given to congregations, and their strength from charisms on the ground. Reflecting critically on some of these key ideas. Stephan Schmid-Keiser takes up Häring’s concerns. His own experiences in leading parishes lead him to discuss some implications from the research of Thomas Wienhardt (2017) on a (more) effective pastoral ministry and to ask to what extent practical theology has so far done what is necessary with regard to strengthening the personal responsibility of the baptised and the confirmed. Finally, the article pleads for changes to church law, without which church life in a changed society would increasingly be side-lined. The article is dedicated to Leo Karrer (died 8 January 2021) for whom the strengthening of genuine participation of God’s people in the life of the faith community was a fundamental concern"
					},
					{
						"note": "abs1:Les pasteurs et leurs communautés sont confrontés à de grands défis internes, en particulier dans leurs relations avec les responsables de l’Église. L’ouvrage «Impulse zur Eigenverantwortung der Gemeinden», publié par Hermann Häring à Pâques 2020, le montre clairement. Ses principales préoccupations portent sur une structure ecclésiale participative, sur le besoin d’une interaction «sur pied d’égalité», sur l’appel à l’autorité de la communauté et au pouvoir que lui donnent ses charismes sur le terrain. Dans une réflexion critique sur certains de ces mots-clés, Stephan Schmid-Keiser reprend les préoccupations de Häring. Ses propres expériences de responsable de paroisse l’amènent à en discuter certaines implications, à partir de la recherche de Thomas Wienhardt (2017) sur un ministère pastoral (plus) efficace et à se demander dans quelle mesure la théologie pratique a, jusqu’ici, fait ce qu’il fallait pour renforcer la responsabilité personnelle des baptisés et des confirmés. Enfin, l’article plaide pour des changements dans la loi de l’Église, faute de quoi l’Église vivrait de plus en plus à la marge d’une société qui a changé. L’article est dédié à Leo Karrer (décédé le 8 janvier 2021). Le renforcement d’une réelle participation du peuple de Dieu à la vie de la communauté était pour lui une préoccupation essentielle."
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://poj.peeters-leuven.be/content.php?url=article&id=3288828&journal_code=EP",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Relational Normative Economics:  An African Approach to Justice",
				"creators": [
					{
						"creatorType": "author",
						"lastName": "Metz",
						"firstName": " Thaddeus"
					}
				],
				"date": "2020",
				"DOI": "10.2143/EP.27.1.3288828",
				"abstractNote": "Recent work by comparative philosophers, global ethicists, and cross-cultural value theorists indicates that, unlike most Western thinkers, those in many other parts of the globe, such as indigenous Africa, East Asia, and South America, tend to prize relationality. These relational values include enjoying a sense of togetherness, participating cooperatively, creating something new together, engaging in mutual aid, and being compassionate. Global economic practices and internationally influential theories pertaining to justice, development, and normative economics over the past 50 years have been principally informed by characteristically Western and individualist values such as utility, autonomy, and capability. In this article I consider what economic appropriation, production, distribution, and consumption would look like if they were more influenced by relational values typical of non-Western worldviews, and especially the sub-Saharan ethic of ubuntu.",
				"issue": "1",
				"libraryCatalog": "ubtue_Peeters",
				"pages": "35-68",
				"publicationTitle": "Ethical Perspectives",
				"shortTitle": "Relational Normative Economics",
				"url": "https://poj.peeters-leuven.be/content.php?url=article&id=3288828&journal_code=EP",
				"volume": "27",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://poj.peeters-leuven.be/content.php?url=article&id=630100&journal_code=EP",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "An Ethical Agenda for Europe:  Fundamental Problems on Practical Ethics in a Christian Perspective",
				"creators": [
					{
						"creatorType": "author",
						"lastName": "Verstraeten",
						"firstName": " Johan"
					}
				],
				"date": "March 1994",
				"DOI": "10.2143/EP.1.1.630100",
				"abstractNote": "Today, applied ethics confronts many problems: technological and biomedical innovations, crisis of the welfare state, rising unemployment, migration and xenophobia. These and the changes accompanying them are, in themselves, important objects of study. An investigation on the level of the differentiated disciplines of practical ethics is insufficient. In as far as practical ethics also serves to disclose reality, it shows that modern problems can only be understood in the light of the general cultural crisis of which they are, at the very least, symptoms. In the first part of this article, we will try to clarify this byanalyzing the crisis in the ethos of modern secularized society. The second part will try to show that Christian ethics can offer a meaningful answer to this cultural crisis, and how it can do so.",
				"issue": "1",
				"libraryCatalog": "ubtue_Peeters",
				"pages": "3-12",
				"publicationTitle": "Ethical Perspectives",
				"shortTitle": "An Ethical Agenda for Europe",
				"url": "https://poj.peeters-leuven.be/content.php?url=article&id=630100&journal_code=EP",
				"volume": "1",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://poj.peeters-leuven.be/content.php?url=article&id=3289673",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "The Spirituality of De imitatione Christi:  A Historian's Reflection on Asceticism and Mysticism in the Devotio moderna",
				"creators": [
					{
						"creatorType": "author",
						"lastName": "Goudriaan",
						"firstName": " Koen"
					}
				],
				"date": "2021",
				"DOI": "10.2143/OGE.91.3.3289673",
				"abstractNote": "This contribution examines the claim made by Rudolf van Dijk († 2015) a dozen years ago, that the reading of Thomas’s Imitatio Christi in the order of the autograph brings to light the ultimately mystical character of the work. A case could be made, indeed, for interpreting not only the book ‘On Consolation Within’, but even the book ‘On the Sacrament of the Altar’, as mystagogical. Consequently, it hardly seems possible any longer to defend a position which denies the mystical elements in Thomas’s work. The lack of unanimity among students of the Imitatio on the relationship between its ascetical and mystical elements may be imputed to the fact that their definition of mysticism mostly remains implicit. Therefore, this contribution traces the roots of the various assessments of the Imitatio, suggesting that these have to be looked for in theology, particularly in the Roman Catholic theological tradition. With the exception of its Pietist branch, Protestant theologians have read the Imitatio not so much for its mystical character as for its edificatory value. In Catholic circles, a debate has taken place about ‘infused’ versus ‘acquired’ contemplation. With reference to this debate, it was the Jesuit Albert Deblaere who gave a very subtle and pertinent analysis of the spirituality of the Imitatio. In his view, far from being a textbook of asceticism, it focuses on the search for religious experience. Nevertheless, due to his strict definition of mysticism, which only recognizes ‘infused’ grace and excludes the possibility of methodical preparation, Deblaere does not admit the Imitatio to the canon of mystical works. As an alternative to Deblaere’s influential approach, the ideas of the Nijmegen school of spirituality studies have been presented. Here, spiritual ascent is analysed as a journey for which a whole array of tools and means is available — the domain customarily assigned to asceticism — , but during which man is gradually transformed under the direct impact of divine reality. These are also the assumptions underneath the plea for a mystical reading of the Imitatio by Van Dijk, who himself belonged to this Nijmegen school. In discussing the book on the Sacrament of the Altar, some clues are followed to the religious experience of the fifteenth-century contemporaries for whom the Imitatio was written in the first place. The final section investigates the implications of the reflections on the Imitatio for the concept of a ‘mystical culture’, which has been used to characterize fifteenth-century religion. This concept, too, appears to embody a Deblaerian view of mysticism. Instead, this contribution makes out a case for a broader concept of mysticism, enabling scholars to come to a fuller recognition of the role it played in late-medieval religious culture.",
				"issue": "3/4",
				"libraryCatalog": "ubtue_Peeters",
				"pages": "293-326",
				"publicationTitle": "Ons Geestelijk Erf",
				"shortTitle": "The Spirituality of De imitatione Christi",
				"url": "https://poj.peeters-leuven.be/content.php?url=article&id=3289673",
				"volume": "91",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://poj.peeters-leuven.be/content.php?url=article&id=3289313&journal_code=ETS",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Corona-Krise:  Eine Herausforderung für die pastorale Arbeit vor Ort",
				"creators": [
					{
						"creatorType": "author",
						"lastName": "Hüser",
						"firstName": " Sara-Marie"
					}
				],
				"date": "2021",
				"DOI": "10.2143/ETS.12.1.3289313",
				"issue": "1",
				"libraryCatalog": "ubtue_Peeters",
				"pages": "161-169",
				"publicationTitle": "ET-Studies",
				"shortTitle": "Corona-Krise",
				"url": "https://poj.peeters-leuven.be/content.php?url=article&id=3289313&journal_code=ETS",
				"volume": "12",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://poj.peeters-leuven.be/content.php?url=article&id=3289298&journal_code=ETS",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Die Corona-Krise als Herausforderung für Theologie und Kirche",
				"creators": [
					{
						"creatorType": "author",
						"lastName": "Kruip",
						"firstName": " Gerhard"
					}
				],
				"date": "2021",
				"DOI": "10.2143/ETS.12.1.3289298",
				"issue": "1",
				"libraryCatalog": "ubtue_Peeters",
				"pages": "v-viii",
				"publicationTitle": "ET-Studies",
				"url": "https://poj.peeters-leuven.be/content.php?url=article&id=3289298&journal_code=ETS",
				"volume": "12",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
