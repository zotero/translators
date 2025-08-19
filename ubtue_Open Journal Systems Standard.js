{
	"translatorID": "a5d5ca83-b975-4abe-86c9-d956d7b9c8fa",
	"label": "ubtue_Open Journal Systems Standard",
	"creator": "Timotheus Kim",
	"target": "article|issue/view/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 99,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-08-19 15:08:11"

/*
	***** BEGIN LICENSE BLOCK *****
	Copyright © 2021 Universitätsbibliothek Tübingen.  All rights reserved.
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
	***** END LICENSE BLOCK *****
*/

function detectWeb(doc, url) {
	let pkpLibraries = ZU.xpath(doc, '//script[contains(@src, "/lib/pkp/js/")]');
	if (url.match(/\/issue\//) && getSearchResults(doc)) return "multiple";
	else if (!ZU.xpathText(doc, '//meta[@name="generator" and contains(@content,"Open Journal Systems")]/@content') && (!(ZU.xpathText(doc, '//a[@id="developedBy"]/@href') == 'http://pkp.sfu.ca/ojs/' ||
		  pkpLibraries.length >= 1))) return false;
	else if (url.match(/\/article\//)) return "journalArticle";
	else return false;
}

function getSearchResults(doc) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//*[contains(concat( " ", @class, " " ), concat( " ", "media-heading", " " ))]//a | //*[contains(concat( " ", @class, " " ), concat( " ", "title", " " ))]//a | //a[contains(@href, "/article/view/") and not(contains(@href, "/pdf")) and not(contains(., "PDF"))]');
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(row.textContent);
		if (!href || !title) continue;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}


function splitDotSeparatedKeywords(item) {
	if (item.ISSN === '2340-0080' && item.tags.length) {
		let split_tags = [];
		for (const tags of item.tags)
			split_tags.push(...tags.split('.'));
		item.tags = split_tags;
	}
	return item.tags;
}


function assignCommaSeparatedKeywords(doc, item) {
	let keywordLine = ZU.xpathText(doc, '//section[@class="item keywords"]//span[@class="value"]');
	if (!keywordLine)
		return [];
	return keywordLine.split(",").map(item => item.trim());
}


function getOrcids(doc, ISSN) {
	let authorSections = ZU.xpath(doc, '//ul[@class="authors-string"]/li');
	let notes = [];

	// e.g. https://www.koersjournal.org.za/index.php/koers/article/view/2472
	for (let authorSection of authorSections) {
		let authorLink = authorSection.querySelector('a.author-string-href span');
		let orcidLink = authorSection.querySelector('[href*="https://orcid.org"]');
		if (authorLink && orcidLink) {
			let author = authorLink.innerText;
			let orcid = orcidLink.textContent.match(/\d+-\d+-\d+-\d+x?/i);
			if (!orcid)
				continue;
			notes.push({note: "orcid:" + orcid + ' | ' + author});
		}
	}
	if (notes.length) return notes;


	// e.g. https://www.sanisidoro.net/publicaciones/index.php/isidorianum/article/view/147
	authorSections = ZU.xpath(doc, '//ul[contains(@class, "authors")]/li');
	for (let authorSection of authorSections) {
		let authorSpans = authorSection.querySelector('span[class="name"]');
		let orcidSpans = authorSection.querySelector('span[class="orcid"]');
		if (authorSpans && orcidSpans) {
		   let author = authorSpans.innerText.trim();
		   let orcidAnchor =  orcidSpans.querySelector('a');
		   if (!orcidAnchor)
			   continue;
		   let orcidUrl = orcidAnchor.href;
		   if (!orcidUrl)
			   continue;
		   let orcid = orcidUrl.match(/\d+-\d+-\d+-\d+x?/i);
		   if (!orcid)
			   continue;
		   notes.push( {note: "orcid:" + orcid + ' | ' + author});
		}
	}
	if (notes.length) return notes;

  	 // e.g. https://jeac.de/ojs/index.php/jeac/article/view/844
  	 // e.g. https://jebs.eu/ojs/index.php/jebs/article/view/336
  	 // e.g. https://bildungsforschung.org/ojs/index.php/beabs/article/view/783
	 if (['2627-6062', '1804-6444', '2748-6419', '1018-1539'].includes(ISSN)) {
  	 	let orcidAuthorEntryCaseA = doc.querySelectorAll('.authors');
  	 	if (orcidAuthorEntryCaseA) {
  		for (let a of orcidAuthorEntryCaseA) {
  			let name_to_orcid = {};
  			let tgs = ZU.xpath(a, './/*[self::strong or self::a]');
  			let tg_nr = 0;
  			for (let t of tgs) {
  				if (t.textContent.match(/orcid/) != null) {
  					name_to_orcid[tgs[tg_nr -1].textContent] = t.textContent.trim();
  					let author = ZU.unescapeHTML(ZU.trimInternal(tgs[tg_nr -1].textContent)).trim();
  					let orcid = ZU.unescapeHTML(ZU.trimInternal(t.textContent)).trim();
  					notes.push({note: orcid.replace(/https?:\/\/orcid.org\//g, 'orcid:') + ' | ' + author});
  				}
  				tg_nr += 1;
  			}
  		}
  	 }
  	 }

	if (notes.length) return notes;

	//e.g. https://ote-journal.otwsa-otssa.org.za/index.php/journal/article/view/433
  	let orcidAuthorEntryCaseB = doc.querySelectorAll('.authors-string');//Z.debug(orcidAuthorEntryCaseC)
  	if (orcidAuthorEntryCaseB) {
  	 	for (let c of orcidAuthorEntryCaseB) {
  			if (c && c.innerHTML.match(/\d+-\d+-\d+-\d+x?/gi)) {
  				let orcid = ZU.xpathText(c, './/a[@class="orcidImage"]/@href', '');
  				let author = ZU.xpathText(c, './/span', '');
  				if (orcid != null && author != null) {
  					author = ZU.unescapeHTML(ZU.trimInternal(author)).trim();
  					orcid = ZU.unescapeHTML(ZU.trimInternal(orcid)).trim();
  					notes.push({note: orcid.replace(/https?:\/\/orcid.org\//g, 'orcid:') + ' | ' + author});
  				}
  			}
  		}
  	}

  	if (notes.length) return notes;

	//e.g. https://missionalia.journals.ac.za/pub/article/view/422
	let orcidAuthorEntryCaseC = doc.querySelectorAll('.authorBio');//Z.debug(orcidAuthorEntryCaseC)
  	if (orcidAuthorEntryCaseC) {
  	 	for (let c of orcidAuthorEntryCaseC) {
  			if (c && c.innerHTML.match(/\d+-\d+-\d+-\d+x?/gi)) {
  				let orcid = ZU.xpathText(c, './/a[@class="orcid"]/@href', '');
  				let author = ZU.xpathText(c, './/em', '');
  				if (orcid != null && author != null) {
  					author = ZU.unescapeHTML(ZU.trimInternal(author)).trim();
  					orcid = ZU.unescapeHTML(ZU.trimInternal(orcid)).trim();
  					notes.push({note: orcid.replace(/https?:\/\/orcid.org\//g, 'orcid:') + ' | ' + author});
  				}
  			}
  		}
  	}

	if (notes.length)
		return notes;
	// kein Beispiel gefunden
  	/*if (orcidAuthorEntryCaseC) {
  		for (let c of orcidAuthorEntryCaseC) {
  			if (c && c.innerText.match(/\d+-\d+-\d+-\d+x?/gi)) {
  				let author = c.innerText;//Z.debug(author  + '   CCC')
  				notes.push({note: ZU.unescapeHTML(ZU.trimInternal(author)).replace(/https?:\/\/orcid\.org\//g, ' | orcid:')});
  			}
  		}
  	}*/

  	// kein Beispiel gefunden
	/*let orcidAuthorEntryCaseD = ZU.xpath(doc, '//div[@id="authors"]');
	if (orcidAuthorEntryCaseD.length != 0) {
		for (let o of ZU.xpath(orcidAuthorEntryCaseD[0], './/div[@class="card-body"]')) {
			if (ZU.xpathText(o, './/a[contains(@href, "orcid")]') != null) {
				let orcid = ZU.trimInternal(ZU.xpathText(o, './/a[contains(@href, "orcid")]'));
				let author = ZU.trimInternal(o.innerHTML.split('&nbsp;')[0]);
				notes.push({note: author + ' | orcid:' + orcid.replace(/https?:\/\/orcid\.org\//g, '')});
			}
		}
	}*/

	// e.g. https://sotrap.psychopen.eu/index.php/sotrap/article/view/9965
	let orcidAuthorEntryCaseD = ZU.xpath(doc, '//ul[contains(@class, "article-details-authors")]');
	if (orcidAuthorEntryCaseD.length) {
		for (let o of ZU.xpath(orcidAuthorEntryCaseD[0], './/li[contains(@class, "list-group-item")]')) {
			let orcidCandidates = ZU.xpath(o, './/a[contains(@href, "orcid")]');
			if (orcidCandidates.length) {
				let orcid = orcidCandidates[0].href;
				let author = ZU.xpathText(o, './/strong');
				notes.push({note: 'orcid:' + orcid.replace(/https?:\/\/orcid\.org\//g, '') + ' | ' + author });
			}
		}
	}

	return notes;
}


// in some cases (issn == 1799-3121) the article's title is split in 2 parts
function joinTitleAndSubtitle (doc, item) {
	if (item.ISSN == '1799-3121') {
		if (doc.querySelector(".subtitle")) {
			item.title = item.title + ': ' + doc.querySelector(".subtitle").textContent.trim();
		}
		return item.title;
	}
	if (item.ISSN == '1018-1539' || item.ISSN == '2748-6419') {
		if (ZU.xpathText(doc, '//h1[@class="page-header"]/small')) {
			item.title = item.title + ': ' + ZU.xpathText(doc, '//h1[@class="page-header"]/small').trim();
		}
		return item.title;
	}

	if (item.ISSN == '2961-6492') {
		let subtitle = ZU.xpathText(doc, '//h1[@class="page_title"]//following-sibling::h2[@class="subtitle"]')?.trim();
		if (subtitle) {
			item.title = item.title + (item.title.slice(-1) == ':' ? '' : ': ') + subtitle;
		}
	}

	if (item.ISSN == '2616-1591') {
		let subtitleCandidate = ZU.xpathText(doc, '//h2[@class="subtitle"]')?.trim();
		if (subtitleCandidate && !item.title.toLowerCase().includes(subtitleCandidate))
		    item.title = item.title + ' ' + subtitleCandidate;
	}

	let subtitle = ZU.xpathText(doc, '//article[@class="article-details"]/header/h2/small')
	if (subtitle)
		item.title = item.title + " " + subtitle.trim();
	return item.title;
}


function invokeUbtuePKPTranslator(doc) {
	var translator = Zotero.loadTranslator("web");
	translator.setDocument(doc);
	// ubtue_PKP
	// Improve results in comparison to direct Embedded Metadata
	// Hardcode selection since using the "translator" event leads to infinite loop in ZTS context
	translator.setTranslator("99b62ba4-065c-4e83-a5c0-d8cc0c75d387");
	translator.setHandler("itemDone", function (t, i) {
		if (i.pages && i.pages.match(/^\d{1,3}–\d{1,3}-\d{1,3}–\d{1,3}/)) {
			let firstandlastpages = i.pages.split('–');
			i.pages = firstandlastpages[0] + '-' + firstandlastpages[2]; // Z.debug(item.pages)
		}
		if (i.ISSN == '2413-3108' && i.pages) {
			// page information is garbled for this journal, get it from DC
			let dc_page_information = ZU.xpathText(doc, '//meta[@name="DC.Identifier.pageNumber"]/@content');
			if (dc_page_information?.length)
				i.pages = dc_page_information.split(/\s+to\s+/)
							 .map(page_fragment => page_fragment.replace(/\d+-(\d+)/, "$1"))
							 .join('-');
		}
		if (i.issue === "0") delete i.issue;
		if (i.abstractNote && i.abstractNote.match(/No abstract available/)) delete i.abstractNote;

		let abstractRegex = /(?:ABSTRACT|RESUME|RESUMEN|SAMMANDRAG|SUMMARY):? /;
		if (i.abstractNote) {
			let absNr = 0;
			for (let abs of i.abstractNote.split(abstractRegex).filter(str => ! /^\s*$/.test(str))) {
				absNr == 0 ? i.abstractNote = abs : i.notes.push('abs:' + ZU.trimInternal(abs));
				++absNr;
			}
		}
		for (let abs of ZU.xpath(doc, '//meta[@name="DC.Description"]/@content')) {
			let found = false;
			for (let note of i.notes) {
				if (note.substring(4,24) == abs.textContent.replace(abstractRegex, '').substring(0,20)) found = true;
			}
			if (i.abstractNote && !(i.abstractNote.trim().substring(0, 20) == abs.textContent.trim().replace(abstractRegex, '').substring(0, 20)) && !found) {
				if (abs.textContent.length)
					i.notes.push('abs:' + ZU.trimInternal(abs.textContent));
			}
		}

		// Fix/remove erroneous abstracts
		if (i.ISSN == '2340-0080') {
			i.abstractNote = i.abstractNote ? i.abstractNote.replace(/&nbsp;/g, "") : "";
			j = 0;
			for (let note of i.notes) {
				if (note.match(/^abs:.*(?:(Translator|&nbsp;))/))
					i.notes[j] = ZU.trimInternal(i.notes[j].replace(/Translator|&nbsp;/g, ""));
				++j;
			}
			i.notes = i.notes.filter(a => !a.match(/^abs:$/));
		}

		i.tags = splitDotSeparatedKeywords(i);
		if (!i.tags || !i.tags.length) {
			i.tags = assignCommaSeparatedKeywords(doc, i);
		}

		i.title = joinTitleAndSubtitle(doc, i);
		// some journal assigns the volume to the date
		if (i.ISSN == '1983-2850') {
			if (i.date == i.volume) {
				let datePath = doc.querySelector('.item.published');

				if (datePath != "") {
					let itemDate = datePath.innerHTML.match(/.*(\d{4}).*/);
					if (itemDate.length >= 2) {
						i.date = itemDate[1];
					}
				} else i.date = '';
			}
		}

		// some journal doesn't supply the issue numbers for older articles directly
		if (i.ISSN == '2328-9902') {
			if (!i.volume) {
				let volumePath = doc.querySelector('.item.citation .csl-entry');

				if (volumePath) {
					let itemVolume = volumePath.innerHTML.match(/, <i>(\d+)<\/i>/);
					if (itemVolume.length >= 2) {
						i.volume = itemVolume[1];
					}
				} else i.volume = '';
			}
		}

		if (['2617-3697', '2660-4418', '2748-6419', '1988-3269', '2699-8440',
			 '1804-6444', '2627-6062', '2504-5156', '2413-3108'].includes(i.ISSN)) {
			if (ZU.xpath(doc, '//meta[@name="DC.Type.articleType"]')) {
				if (ZU.xpath(doc, '//meta[@name="DC.Type.articleType"]')[0].content.match(
							/(Media reviews)|(Rezensionen)|(Reseñas)|(Book Reviews?)/i)) {
								i.tags.push("Book Review");
				}
			}
		}

		let orcids = getOrcids(doc, i.ISSN);
		if (orcids.length)
			i.notes.push(...orcids);
		i.complete();
	});
	translator.translate();
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) === "multiple") {
		Zotero.selectItems(getSearchResults(doc), function (items) {
			if (!items) {
				return true;
			}
			var articles = [];
			for (var i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, invokeUbtuePKPTranslator);
		});
	} else {
		invokeUbtuePKPTranslator(doc, url);
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://ojs.reformedjournals.co.za/stj/issue/view/70",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://ojs.reformedjournals.co.za/stj/article/view/1969",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "“The message to the people of South Africa” in contemporary context: The question of Palestine and the challenge to the church",
				"creators": [
					{
						"firstName": "Mark",
						"lastName": "Braverman",
						"creatorType": "author"
					}
				],
				"date": "2019",
				"DOI": "10.17570/stj.2019.v5n3.a01",
				"ISSN": "2413-9467",
				"abstractNote": "In September 2018 John de Gruchy presented a paper at the Volmoed Colloquium entitled “Revisiting the Message to the people of South Africa,” in which he asks, “what is the significance of the document for our time?” In this expanded version of the author’s response to de Gruchy, two further questions are pursued: First: how can the churches today meet the challenge of today’s global system of economically and politically-driven inequality driven by a constellation of individuals, corporations, and governments? Second: in his review of church history, de Gruchy focused on the issue of church theology described in the 1985 Kairos South Africa document, in which churches use words that purport to support justice but actually serve to shore up the status quo of discrimination, inequality and racism. How does church theology manifest in the contemporary global context, and what is the remedy? The author proposes that ecumenism can serve as a mobilizing and organizing model for church action, and that active engagement in the issue of Palestine is an entry point for church renewal and for a necessary and fruitful exploration of critical issues in theology and ecclesiology.",
				"issue": "3",
				"journalAbbreviation": "STJ",
				"language": "en",
				"libraryCatalog": "ojs.reformedjournals.co.za",
				"pages": "13-40",
				"publicationTitle": "STJ – Stellenbosch Theological Journal",
				"rights": "Copyright (c) 2020 Pieter de Waal Neethling Trust, Stellenbosch",
				"shortTitle": "“The message to the people of South Africa” in contemporary context",
				"url": "https://ojs.reformedjournals.co.za/stj/article/view/1969",
				"volume": "5",
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
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.zwingliana.ch/index.php/zwa/article/view/2516",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Geleitwort",
				"creators": [
					{
						"firstName": "Christian",
						"lastName": "Oesterheld",
						"creatorType": "author"
					}
				],
				"date": "2018",
				"ISSN": "0254-4407",
				"language": "en",
				"libraryCatalog": "www.zwingliana.ch",
				"pages": "VII-IX",
				"publicationTitle": "Zwingliana",
				"rights": "Authors who are published in this journal agree to the following conditions:  a) The authors retain the copyright and allow the journal to print the first publication in print as well as to make it electronically available at the end of three years.  b) The author may allot distribution of their first version of the article with additional contracts for non-exclusive publications by naming the first publication in this Journal in said publication (i.e. publishing the article in a book or other publications).",
				"url": "http://www.zwingliana.ch/index.php/zwa/article/view/2516",
				"volume": "45",
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
		"url": "https://jeac.de/ojs/index.php/jeac/article/view/846",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Review of: Marcus Mescher, The Ethics of Encounter. Christian Neighbor Love as A Practice of Solidarity",
				"creators": [
					{
						"firstName": "Nélida Naveros",
						"lastName": "Córdova",
						"creatorType": "author"
					}
				],
				"date": "2021/12/20",
				"DOI": "10.25784/jeac.v3i0.846",
				"ISSN": "2627-6062",
				"journalAbbreviation": "1",
				"language": "de",
				"libraryCatalog": "jeac.de",
				"pages": "127-129",
				"publicationTitle": "Journal of Ethics in Antiquity and Christianity",
				"rights": "Copyright (c) 2021 Journal of Ethics in Antiquity and Christianity",
				"shortTitle": "Review of",
				"url": "https://jeac.de/ojs/index.php/jeac/article/view/846",
				"volume": "3",
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
						"tag": "Book Review"
					},
					{
						"tag": "Ethik"
					},
					{
						"tag": "Ethik der Begnung"
					},
					{
						"tag": "Ethik in Antike und Christentum"
					},
					{
						"tag": "Liebesgebot"
					},
					{
						"tag": "Marcus Mescher"
					},
					{
						"tag": "Nächstenliebe"
					},
					{
						"tag": "Theologische Ethik"
					}
				],
				"notes": [
					{
						"note": "orcid:0000-0003-3280-5914 | Nélida Naveros Córdova"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://jebs.eu/ojs/index.php/jebs/article/view/921",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Rooting Our Systematic Theologies: The Moral Dimension of a Theology of Retrieval",
				"creators": [
					{
						"firstName": "Jan Martijn",
						"lastName": "Abrahamse",
						"creatorType": "author"
					}
				],
				"date": "2021/12/19",
				"DOI": "10.25782/jebs.v21i2.921",
				"ISSN": "1804-6444",
				"abstractNote": "In the last decades ‘theologies of retrieval’ have become a popular way of doing systematic theology and reconnecting pre-modern authors with contemporary theological issues. This ‘retrieval’ of history within systematic theology is, however, not without its moral challenges. Certainly, today we have become more conscious of our presumptions and one-sidedness in our interpretations of historical events (e.g. the Dutch ‘golden’ age). A theology of retrieval can hence quickly be used to serve particular contemporary theological ends that fail to do justice to the complexity of the actual sources and run the risk of ‘overemplotting’ the past. Based on an exploration of James McClendon’s retrieval of the Radical Reformation in his baptist vision, an argument is made for a more conscious ‘art of historical conversation’ within present-day systematic theology, especially theologies of retrieval.",
				"issue": "2",
				"journalAbbreviation": "1",
				"language": "en",
				"libraryCatalog": "jebs.eu",
				"pages": "77-100",
				"publicationTitle": "Journal of European Baptist Studies",
				"rights": "Copyright (c) 2021 Journal of European Baptist Studies",
				"shortTitle": "Rooting Our Systematic Theologies",
				"url": "https://jebs.eu/ojs/index.php/jebs/article/view/921",
				"volume": "21",
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
						"tag": "James McClendon"
					},
					{
						"tag": "Radical Reformation"
					},
					{
						"tag": "Theology of retrieval"
					},
					{
						"tag": "church history"
					},
					{
						"tag": "ethics"
					},
					{
						"tag": "systematic theology"
					}
				],
				"notes": [
					{
						"note": "orcid:0000-0003-3726-271X | Jan Martijn Abrahamse"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://periodicos.uem.br/ojs/index.php/RbhrAnpuh/article/view/54840",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Razões para peregrinar:",
				"creators": [
					{
						"firstName": "Edilece Souza",
						"lastName": "Couto",
						"creatorType": "author"
					},
					{
						"firstName": "Tânia Maria Meira",
						"lastName": "Mota",
						"creatorType": "author"
					}
				],
				"date": "2020",
				"DOI": "10.4025/rbhranpuh.v13i38.54840",
				"ISSN": "1983-2850",
				"abstractNote": "O artigo trata da vivência religiosa em Ituaçu – BA, cidade da Chapada Diamantina, na primeira metade do século XX. Por meio dos relatos orais, da documentação eclesiástica e das crônicas, apresentamos as narrativas, sobre a origem e o desenvolvimento das devoções, elaboradas pelos agentes religiosos: devotos, romeiros, peregrinos, promesseiros e clérigos, que fazem do ato de peregrinar a própria vida como viagem. Anualmente, entre os meses de agosto e setembro, os devotos e romeiros ocupam a Gruta da Mangabeira com seus cantos, benditos, rezas, ladainhas, novenas e procissões. A pesquisa demonstrou que, naquele espaço sacralizado, os fiéis rendem graça, renovam seus votos e promessas e re-atualizam seus mitos, sua fé e suas crenças.",
				"issue": "38",
				"journalAbbreviation": "1",
				"language": "pt",
				"libraryCatalog": "periodicos.uem.br",
				"publicationTitle": "Revista Brasileira de História das Religiões",
				"rights": "Copyright (c) 2020 Edilece Souza Couto, Tânia Maria Meira Mota (Autor)",
				"shortTitle": "Razões para peregrinar",
				"url": "https://periodicos.uem.br/ojs/index.php/RbhrAnpuh/article/view/54840",
				"volume": "13",
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
						"tag": "Catolicismo"
					},
					{
						"tag": "Peregrinação"
					},
					{
						"tag": "Romaria"
					}
				],
				"notes": [
					{
						"note": "orcid:0000-0003-3618-7455 | Tânia Maria Meira Mota"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://revistasfranciscanas.org/index.php/ArchivoIberoAmericano/article/view/117",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "La Orden Tercera Franciscana en la península ibérica",
				"creators": [
					{
						"firstName": "Alfredo Martín",
						"lastName": "García",
						"creatorType": "author"
					}
				],
				"date": "2017",
				"ISSN": "2660-4418",
				"abstractNote": "After examining the state of the question regarding the Third Order of Saint Francis in Spain and Portugal, the present study analyses the medieval origins of this secular Franciscan order in the Iberian Peninsula. Subsequently, it examines the reasons for its decline in the late Middle Ages and beginning of the Early Modern Period, relating this to questions of a political nature, including pressure from the crown, ideology, the influence of heretical movements, and the internal organization of the Franciscans. This is followed by an analysis of the Order’s subsequent recovery in the early 17th century, which was closely linked to the reforms of the Council of Trent, in which secular religious associations played a major role. Lastly, the main reasons for the success of a secular order among various sectors of Old Regime society are explored, underlining the need to move away from earlier accusations that in the Early Modern Period, the Third Order had lost its original religious purity.\nReferences\nAlves, Marieta. História da Venerável Ordem 3ª da Penitência do Seráfico Pe. São Francisco da Congregação da Bahia. Bahia: Imprensa Nacional, 1948.\nAmberes, Fredegando de. La Tercera Orden Secular de San Francisco, 1221-1921. Barcelona: Casa Editorial de Arte Católico, 1925.\nBarcelona, Martín de. «Ensayo de bibliografía hispano-americana referente a la V.O.T.». Estudios franciscanos, 27 (1921): 502-521.\nBarrico, Joaquim Simões. Noticia historica da Veneravel Ordem Terceira da Penitencia de S. Francisco da cidade de Coímbra e do seu Hospital e Asylo. Coímbra: Tipografía de J.J. Reis Leitão, 1895.\nCabot Roselló, Salvador. «Evolución de la regla de la Tercera Orden Franciscana». En El franciscanismo en la Península Ibérica. Balances y perspectivas: I Congreso Internacional, ed. por María del Mar Graña Cid, 653-678. Barcelona: Asociación Hispánica de Estudios Franciscanos, 2005.\nCarrillo, Juan de. Primera parte de la Historia de la Tercera Orden de Nuestro Seraphico P. S. Francisco. Zaragoza: por Lucas Sánchez, 1610.\nDelgado Pavón, María Dolores. Reyes, nobles y burgueses en auxilio de la pobreza (la Venerable Orden Tercera Seglar de San Francisco de Madrid en el siglo xvii). Alcalá de Henares: Universidad de Alcalá, 2009.\nGonzález Lopo, «Balance y perspectivas de los estudios de la VOT franciscana en Galicia (siglos xvii-xix)». En El franciscanismo en la Península Ibérica. Balances y perspectivas: I Congreso Internacional, ed. por María del Mar Graña Cid, 567-583. Barcelona: Asociación Hispánica de Estudios Franciscanos, 2005.\nGraña Cid, María del Mar. «Las órdenes mendicantes en el obispado de Mondoñedo. El convento de San Martín de Villaoriente (1374-1500)». Estudios mindonienses 6 (1990):13-464.\nMartín García, Alfredo. «Los franciscanos seglares en la Corona de Castilla durante el Antiguo Régimen». Hispania Sacra 57, nº 116 (2005): 441-466.\nMartín García, Alfredo. Religión y sociedad en Ferrolterra durante el Antiguo Régimen: La V.O.T. seglar franciscana. Ferrol: Concello de Ferrol, 2005.\nMartín García, Alfredo. «Franciscanismo seglar y propaganda en la Península Ibérica y Ultramar durante la Edad Moderna». Semata: Ciencias sociais e humanidades 26 (2014): 271-293.\nMartín García, Alfredo. «Franciscanismo y religiosidad popular en el Norte de Portugal durante la Edad Moderna. La fraternidad de Ponte de Lima». Archivo Ibero-Americano 74, nº 279 (2014): 517-556.\nMartínez Vega, Elisa. «Los congresos de la VOT en Madrid». En El franciscanismo en la Península Ibérica. Balances y perspectivas: I Congreso Internacional, ed. por María del Mar Graña Cid. Barcelona: Asociación Hispánica de Estudios Franciscanos, 2005.\nMeesserman, Giles Gérard. Dossier de l'Ordre de la pénitence au 13e siècle. Friburgo: Éditions Universitaires, 1961.\nMeesserman, Giles Gérard. Ordo fraternitatis. Confraternite e pietà dei laici nel Medioevo. Roma: Herder, 1977.\nOrtmann, Adalberto. História da Antiga Capela da Ordem Terceira da Penitência de São Francisco em São Paulo. (Rio de Janeiro: Ministério da Educação e Saúde, 1951.\nPompei, Alfonso. «Il movimento penitenziale nei secoli xii-xiii», Collectanea franciscana 41 (1973): 9-40.\nPou y Martí, José María. Visionarios, beguinos y fraticelos catalanes (siglos xiii-xv). Alicante: Instituto de Cultura Juan Gil-Albert, 1996.\nRey Castelao, Ofelia. «La Orden Tercera Franciscana en el contexto del asociacionismo religioso gallego en el Antiguo Régimen: La V.O.T. de la villa de Padrón». Archivo Ibero-Americano 59, nº 232 (1999): 3-47.\nRibeiro, Bartolomeu. Os terceiros franciscanos portugueses. Sete séculos da súa história. Braga: Tipografia «Missões Franciscanas», 1952.\nSánchez Herrero, José. «Beguinos y Tercera Orden Regular de San Francisco en Castilla». Historia. Instituciones. Documentos 19 (1992): 433-448.\nSerra de Manresa, Valentí. «Els Terciaris franciscans a l´epoca moderna (segles xvii i xviii)». Pedralbes 14 (1994): 93-105.\nVillapadierna, Isidoro de. «Observaciones críticas sobre la Tercera Orden de penitencia en España». Collectanea franciscana 41 (1973): 219-227.\nVillapadierna, Isidoro de. «Vida comunitaria de los terciarios franciscanos de España en el siglo xiv». Analecta T.O.R. 6 (1982): 91-113.\nZaremba, Anthony. Franciscan Social Reform. A Study of the Third Order Secular of St. Francis as an Agency of Social Reform, According to Certain Papal Documents. Pulaski, Wisconsin: Catholic University of America, 1947.",
				"issue": "284",
				"journalAbbreviation": "1",
				"language": "es",
				"libraryCatalog": "revistasfranciscanas.org",
				"pages": "69-97",
				"publicationTitle": "Archivo Ibero-Americano",
				"rights": "Derechos de autor 2017 Archivo Ibero-Americano",
				"url": "https://revistasfranciscanas.org/index.php/ArchivoIberoAmericano/article/view/117",
				"volume": "77",
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
						"tag": "Edad Media"
					},
					{
						"tag": "Edad Moderna"
					},
					{
						"tag": "Orden Tercera Franciscana"
					},
					{
						"tag": "asociacionismo religioso secular"
					},
					{
						"tag": "península ibérica"
					}
				],
				"notes": [
					"abs:Tras acometer un estado de la cuestión sobre los estudios referidos a la Tercera Orden Franciscana en el caso español y portugués, el trabajo comienza analizando los orígenes medievales del franciscanismo secular en la península ibérica. Posteriormente, estudia las razones del proceso de decadencia en el que se vio sumido a finales del Medievo y comienzos de la Edad Moderna, poniéndolo en relación con cuestiones de carácter político –la presión del poder real–, ideológico –la influencia de los movimientos heréticos– o de propia organización interna del franciscanismo. Se adentra más adelante en las razones de su posterior recuperación, a comienzos del siglo xvii, íntimamente unida a la reforma emanada del Concilio de Trento, en la que el asociacionismo religioso secular juega un papel de primer orden. Finalmente, trata de explicar las claves del éxito de la fórmula terciaria entre los diferentes sectores de la sociedad del Antiguo Régimen, subrayando la necesidad de abandonar los viejos tópicos que acusan a la Tercera Orden de la Época Moderna de alejarse en lo religioso de su pureza originaria.\nReferencias\nAlves, Marieta. História da Venerável Ordem 3ª da Penitência do Seráfico Pe. São Francisco da Congregação da Bahia. Bahia: Imprensa Nacional, 1948.\nAmberes, Fredegando de. La Tercera Orden Secular de San Francisco, 1221-1921. Barcelona: Casa Editorial de Arte Católico, 1925.\nBarcelona, Martín de. «Ensayo de bibliografía hispano-americana referente a la V.O.T.». Estudios franciscanos, 27 (1921): 502-521.\nBarrico, Joaquim Simões. Noticia historica da Veneravel Ordem Terceira da Penitencia de S. Francisco da cidade de Coímbra e do seu Hospital e Asylo. Coímbra: Tipografía de J.J. Reis Leitão, 1895.\nCabot Roselló, Salvador. «Evolución de la regla de la Tercera Orden Franciscana». En El franciscanismo en la Península Ibérica. Balances y perspectivas: I Congreso Internacional, ed. por María del Mar Graña Cid, 653-678. Barcelona: Asociación Hispánica de Estudios Franciscanos, 2005.\nCarrillo, Juan de. Primera parte de la Historia de la Tercera Orden de Nuestro Seraphico P. S. Francisco. Zaragoza: por Lucas Sánchez, 1610.\nDelgado Pavón, María Dolores. Reyes, nobles y burgueses en auxilio de la pobreza (la Venerable Orden Tercera Seglar de San Francisco de Madrid en el siglo xvii). Alcalá de Henares: Universidad de Alcalá, 2009.\nGonzález Lopo, «Balance y perspectivas de los estudios de la VOT franciscana en Galicia (siglos xvii-xix)». En El franciscanismo en la Península Ibérica. Balances y perspectivas: I Congreso Internacional, ed. por María del Mar Graña Cid, 567-583. Barcelona: Asociación Hispánica de Estudios Franciscanos, 2005.\nGraña Cid, María del Mar. «Las órdenes mendicantes en el obispado de Mondoñedo. El convento de San Martín de Villaoriente (1374-1500)». Estudios mindonienses 6 (1990):13-464.\nMartín García, Alfredo. «Los franciscanos seglares en la Corona de Castilla durante el Antiguo Régimen». Hispania Sacra 57, nº 116 (2005): 441-466.\nMartín García, Alfredo. Religión y sociedad en Ferrolterra durante el Antiguo Régimen: La V.O.T. seglar franciscana. Ferrol: Concello de Ferrol, 2005.\nMartín García, Alfredo. «Franciscanismo seglar y propaganda en la Península Ibérica y Ultramar durante la Edad Moderna». Semata: Ciencias sociais e humanidades 26 (2014): 271-293.\nMartín García, Alfredo. «Franciscanismo y religiosidad popular en el Norte de Portugal durante la Edad Moderna. La fraternidad de Ponte de Lima». Archivo Ibero-Americano 74, nº 279 (2014): 517-556.\nMartínez Vega, Elisa. «Los congresos de la VOT en Madrid». En El franciscanismo en la Península Ibérica. Balances y perspectivas: I Congreso Internacional, ed. por María del Mar Graña Cid. Barcelona: Asociación Hispánica de Estudios Franciscanos, 2005.\nMeesserman, Giles Gérard. Dossier de l'Ordre de la pénitence au 13e siècle. Friburgo: Éditions Universitaires, 1961.\nMeesserman, Giles Gérard. Ordo fraternitatis. Confraternite e pietà dei laici nel Medioevo. Roma: Herder, 1977.\nOrtmann, Adalberto. História da Antiga Capela da Ordem Terceira da Penitência de São Francisco em São Paulo. (Rio de Janeiro: Ministério da Educação e Saúde, 1951.\nPompei, Alfonso. «Il movimento penitenziale nei secoli xii-xiii», Collectanea franciscana 41 (1973): 9-40.\nPou y Martí, José María. Visionarios, beguinos y fraticelos catalanes (siglos xiii-xv). Alicante: Instituto de Cultura Juan Gil-Albert, 1996.\nRey Castelao, Ofelia. «La Orden Tercera Franciscana en el contexto del asociacionismo religioso gallego en el Antiguo Régimen: La V.O.T. de la villa de Padrón». Archivo Ibero-Americano 59, nº 232 (1999): 3-47.\nRibeiro, Bartolomeu. Os terceiros franciscanos portugueses. Sete séculos da súa história. Braga: Tipografia «Missões Franciscanas», 1952.\nSánchez Herrero, José. «Beguinos y Tercera Orden Regular de San Francisco en Castilla». Historia. Instituciones. Documentos 19 (1992): 433-448.\nSerra de Manresa, Valentí. «Els Terciaris franciscans a l´epoca moderna (segles xvii i xviii)». Pedralbes 14 (1994): 93-105.\nVillapadierna, Isidoro de. «Observaciones críticas sobre la Tercera Orden de penitencia en España». Collectanea franciscana 41 (1973): 219-227.\nVillapadierna, Isidoro de. «Vida comunitaria de los terciarios franciscanos de España en el siglo xiv». Analecta T.O.R. 6 (1982): 91-113.\nZaremba, Anthony. Franciscan Social Reform. A Study of the Third Order Secular of St. Francis as an Agency of Social Reform, According to Certain Papal Documents. Pulaski, Wisconsin: Catholic University of America, 1947.",
					{
						"note": "orcid:0000-0001-6906-0210 | Alfredo Martín García"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://vulgata-dialog.ch/ojs/index.php/vidbor/article/view/821",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Les enjeux de la Transfiguration",
				"creators": [
					{
						"firstName": "Tarciziu Hristofor",
						"lastName": "Șerban",
						"creatorType": "author"
					}
				],
				"date": "2021/11/04",
				"DOI": "10.25788/vidbor.v5i1.821",
				"ISSN": "2504-5156",
				"abstractNote": "Im Vergleich der griechischen und lateinischen Texte der Verklärung Jesu auf dem Berg Tabor (Mk 9,2-10; Mt 17,1-9; Lk 9,28-36) wird gezeigt, wie die Vulgata NT diese zentrale, sehr spezielle Thematik beleuchtet. In diesem Ansatz werden auch theologisch äusserst relevante Fragen aufgeworfen, wie nach der Gattung des Verklärungstexts, aber auch nach dem Zusammenhang der Verklärung mit der Episode des Bundesschlusses in Ex 24 auf dem Berg Sinai. Handelt es sich hier um die literarische Vorlage?",
				"journalAbbreviation": "1",
				"language": "en",
				"libraryCatalog": "vulgata-dialog.ch",
				"pages": "29-40",
				"publicationTitle": "Vulgata in Dialogue. A Biblical On-Line Review",
				"rights": "Copyright (c) 2021 Vulgata in Dialogue. A Biblical On-Line Review",
				"url": "https://vulgata-dialog.ch/ojs/index.php/vidbor/article/view/821",
				"volume": "5",
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
						"tag": "Apostel"
					},
					{
						"tag": "Bund"
					},
					{
						"tag": "Elija"
					},
					{
						"tag": "Eucharistie"
					},
					{
						"tag": "Mose"
					},
					{
						"tag": "Synoptische Evangelien"
					},
					{
						"tag": "Verklärung"
					}
				],
				"notes": [
					"abs:By comparing the Greek and Latin texts of the transfiguration of Jesus on Mount Tabor (Mk 9:2-10; Mt 17:1-9; Lk 9:28-36), it is shown how the Vulgate NT illuminates this central, very special theme. This essay also raises relevant theological questions, such as the genre of the Transfiguration text, but also the connection of the Transfiguration with the episode of the making of the covenant in Ex 24 on Mount Sinai. Is this the literarische Vorlage?",
					{
						"note": "orcid:0000-0003-4838-4368 | Tarciziu Hristofor Șerban, Lect. univ. dr."
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://missionalia.journals.ac.za/pub/article/view/422",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Erlo Hartwig Stegen: Pioneer, missionary and revival preacher in an apartheid South Africa",
				"creators": [
					{
						"firstName": "Elfrieda Marie-Louise",
						"lastName": "Fleischmann",
						"creatorType": "author"
					},
					{
						"firstName": "Ignatius W.",
						"lastName": "Ferreira",
						"creatorType": "author"
					},
					{
						"firstName": "Claudia",
						"lastName": "Gouws",
						"creatorType": "author"
					},
					{
						"firstName": "Francois",
						"lastName": "Muller",
						"creatorType": "author"
					}
				],
				"date": "2021/12/30",
				"DOI": "10.7832/49-0-422",
				"ISSN": "2312-878X",
				"abstractNote": "As not much academic attention has been paid to the life and ministry of Erlo Hartwig Stegen (1935-present), his paper seeks to provide more insight into Erlo Stegen’s pioneering journey towards a self-sustainable protestant rural Zulu mission station, KwaSizabantu Mission, in an apartheid South Africa. Data was gleaned from interviews, documents, newsletters, reports and sermons. Thematic content analysis provided more insight into Stegen’s pioneering, missionary endeavours as well his journey towards an awakening among the Zulus. We argue that the missiological impact of Stegen’s ministry had benefitted the Zulu nation greatly.",
				"language": "en",
				"libraryCatalog": "missionalia.journals.ac.za",
				"publicationTitle": "Missionalia: Southern African Journal of Missiology",
				"rights": "Copyright (c) 2021 Missionalia: Southern African Journal of Missiology",
				"shortTitle": "Erlo Hartwig Stegen",
				"url": "https://missionalia.journals.ac.za/pub/article/view/422",
				"volume": "49",
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
						"tag": "Apartheid"
					},
					{
						"tag": "Erlo Stegen"
					},
					{
						"tag": "KwaSizabantu Mission"
					},
					{
						"tag": "Pioneer"
					},
					{
						"tag": "South Africa."
					},
					{
						"tag": "missionary"
					},
					{
						"tag": "pioneer"
					},
					{
						"tag": "revival"
					},
					{
						"tag": "self-sustainable mission"
					}
				],
				"notes": [
					{
						"note": "orcid:0000-0002-0918-0226 | Elfrieda Marie-Louise Fleischmann"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://tidsskrift.dk/rvt/article/view/132100",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "What Did King Hákon góði Do before the Battle at Fitjar and after the Battle at Avaldsnes?",
				"creators": [
					{
						"firstName": "Andreas",
						"lastName": "Nordberg",
						"creatorType": "author"
					}
				],
				"date": "2022/03/25",
				"DOI": "10.7146/rt.v74i.132100",
				"ISSN": "1904-8181",
				"abstractNote": "The starting point for this paper is the enigmatic stanza 6 of the Norwegian skald Guthormr sindri's mid-900s poem Hákonardrápa. This stanza depicts the Norwegian king Hákon góði clashing his spears together over the heads of the fallen warriors after the battle of Avaldsnes. But why did he do it? And what did Hákon do when he \"played\" (lék) in front of his army before the Battle of Fitjar, as portrayed in Eyvindr Finnsson’s poem Hákonarmál? Roman sources, iconographic motifs from the migration period to the Viking age, as well as information in Old Norse literature, suggest that war dances, intimidating movements, as well as aggressive and incendiary gestures, cries and songs constituted an important aspect of warfare among Germanic and Scandinavian peoples. In this paper, it is suggested that Hákon's – to us – enigmatic performances in Hákonardrápa and Hákonarmál may be understandable within the framework of this martial context.",
				"journalAbbreviation": "RvT",
				"language": "da",
				"libraryCatalog": "tidsskrift.dk",
				"pages": "119-138",
				"publicationTitle": "Religionsvidenskabeligt Tidsskrift",
				"rights": "Copyright (c) 2022 Forfatter og Tidsskrift",
				"url": "https://tidsskrift.dk/rvt/article/view/132100",
				"volume": "74",
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
						"tag": "Skaldic Poetry"
					},
					{
						"tag": "battlefield behaviour"
					},
					{
						"tag": "ritual"
					},
					{
						"tag": "war dance"
					},
					{
						"tag": "Óðinn worship"
					}
				],
				"notes": [
					"abs:Utgångspunkten för denna artikel är en gåtfull strof (6) i den norske skalden Guthormr sindri’s dikt Hákonardrápa, från mitten av 900-talet. Strofen beskriver hur den norske kungen Hákon góði slog samman spjut över huvudena på de fallna krigare, som låg spridda över slagfältet efter slaget vid Avaldsnes. Varför gjorde han det? Och vad gjorde samme kung Hákon, när han enligt Eyvindr Finnsson’s poem Hákonarmál “lekte” (lék) framför sina krigare på slagfältet före slaget vid Fitjar? Romerska källor, ikonografiska motiv från folkvandringstid till vikingatid, liksom uppgifter i den norröna litteraturen, visar att krigsdanser, hotfulla rörelser samt aggressiva och eggande gester, utrop och sånger var viktiga inslag i krigsföringen bland de germanska och skandinaviska folken. I denna artikel föreslås att Hákon’s – för oss – gåtfulla handlingar i Hákonardrápa och Hákonarmál blir förståeliga inom ramen för denna militära kontext."
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://oerf-journal.eu/index.php/oerf/article/view/318",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Mehrperspektivität durch fächerkooperierenden Unterricht: Interreligiöses Begegnungslernen zwischen Schülerinnen und Schülern der Fächer des RUs und des Ethik- bzw. Philosophieunterrichts",
				"creators": [
					{
						"firstName": "Katja",
						"lastName": "Boehme",
						"creatorType": "author"
					},
					{
						"firstName": "Hans-Bernhard",
						"lastName": "Petermann",
						"creatorType": "author"
					}
				],
				"date": "2022/05/16",
				"DOI": "10.25364/10.30:2022.1.12",
				"ISSN": "1018-1539",
				"abstractNote": "Interreligiöses Begegnungslernen (IRBL) in Kooperation der Schul- und Studienfächer der Theologien bzw. des bekenntnisorientierten Religionsunterrichts und der Philosophie/Ethik wird im Raum Heidelberg und in Wien in Schulprojekten durchgeführt und seit 2007/08 &nbsp;in der Lehrkräfteausbildung der KPH Wien/Krems und seit 2011 an der PH Heidelberg (dort in Kooperation mit anderen Lehrkräfteausbildungsstätten) angeboten. Vorliegender Beitrag orientiert über bildungskonzeptionelle Rahmenbedingungen und Herausforderungen einer Kooperation zwischen den Schulfächern des Religions- und Ethikunterrichts wie auch konkret über Organisation und Themen des IRBL auf dem Hintergrund erprobter und evaluierter Projekte in Schule und Hochschule aus dem Raum Heidelberg.",
				"issue": "1",
				"journalAbbreviation": "1",
				"language": "de",
				"libraryCatalog": "oerf-journal.eu",
				"pages": "202-217",
				"publicationTitle": "Österreichisches Religionspädagogisches Forum",
				"rights": "Copyright (c) 2022 Österreichisches Religionspädagogisches Forum",
				"shortTitle": "Mehrperspektivität durch fächerkooperierenden Unterricht",
				"url": "https://oerf-journal.eu/index.php/oerf/article/view/318",
				"volume": "30",
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
						"tag": "Begegnungslernen"
					},
					{
						"tag": "Interdisziplinarität"
					},
					{
						"tag": "Interreligiosität"
					},
					{
						"tag": "Mehrperspektivität"
					},
					{
						"tag": "Projektunterricht"
					}
				],
				"notes": [
					"abs:Interreligious Learning in encounter (IRBL) through cooperation between the subjects of the theologies (or confession-oriented subjects of religious education) and philosophy/ethics in school and university is carried out in school projects in the Heidelberg region and in Vienna and has been offered as an additional qualification in teacher training since 2007/08 at KPH Vienna/Krems and since 2011 at the University of Education in Heidelberg. This article provides an orientation on the educational conceptual framework and challenges of cooperation between the school subjects of religion and ethics and specifically on the organization and topics of the IRBL against the background of practiced and evaluated projects in schools and universities."
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.sanisidoro.net/publicaciones/index.php/isidorianum/article/view/147",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "“Battle is over, raise we the cry of victory”. Study of Revelation 19:11-21",
				"creators": [
					{
						"firstName": "Francisco Javier",
						"lastName": "Ruiz-Ortiz",
						"creatorType": "author"
					}
				],
				"date": "2020/11/20",
				"DOI": "10.46543/ISID.2029.1054",
				"ISSN": "2660-7743",
				"abstractNote": "Using some of the tools of narrative criticism, this article studies the final battle and victory which is achieved by God’s envoy. By unpacking the network of relationship in the text the envoy is identified with the Christ of God, who has been present in the book from the beginning. The article shows how the Rider on the white horse summarises what the book of Revelation has said about Jesus.",
				"issue": "2",
				"journalAbbreviation": "Isidorianum",
				"language": "es",
				"libraryCatalog": "www.sanisidoro.net",
				"pages": "37-60",
				"publicationTitle": "Isidorianum",
				"rights": "Derechos de autor 2020 Isidorianum",
				"shortTitle": "“Battle is over, raise we the cry of victory”. Study of Revelation 19",
				"url": "https://www.sanisidoro.net/publicaciones/index.php/isidorianum/article/view/147",
				"volume": "29",
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
						"tag": "Ap 19"
					},
					{
						"tag": "Apocalipsis"
					},
					{
						"tag": "cristología"
					},
					{
						"tag": "juicio final"
					}
				],
				"notes": [
					"abs:Usando elementos del análisis narrativo, este artículo examina la batalla final y la victoria que se consigue a través del enviado de Dios, un jinete en un caballo blanco. Desenredando la red de relaciones en el texto, el jinete en el caballo blanco se identifica con el Cristo de Dios, que ha estado presente en el libro desde el inicio. El artículo muestra como el Jinete en el caballo blanco resume en sí mismo todo lo que el Apocalipsis dice sobre Jesús.",
					{
						"note": "orcid:0000-0001-6251-0506 | Francisco Javier Ruiz-Ortiz"
					}
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
