{
	"translatorID": "a5d5ca83-b975-4abe-86c9-d956d7b9c8fa",
	"label": "ubtue_Open Journal Systems Standard",
	"creator": "Timotheus Kim",
	"target": "article|issue/view/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-02-18 15:41:55"
}

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
	let pkpLibraries = ZU.xpath(doc, '//script[contains(@src, "/lib/pkp/js/")]')
	if (!(ZU.xpathText(doc, '//a[@id="developedBy"]/@href') == 'http://pkp.sfu.ca/ojs/' ||
		  pkpLibraries.length >= 1))
		return false;
	else if (url.match(/article/)) return "journalArticle";
	else return false;
}

function getSearchResults(doc) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//*[contains(concat( " ", @class, " " ), concat( " ", "media-heading", " " ))]//a | //*[contains(concat( " ", @class, " " ), concat( " ", "title", " " ))]//a | //a[contains(@href, "/article/view/") and not(contains(@href, "/pdf"))]');
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
	if (item.ISSN === "2340-0080" && item.tags.length) {
		let split_tags = [];
		for (const tags of item.tags)
			split_tags.push(...tags.split('.'));
		item.tags = split_tags;
	}
	return item.tags;
}


function getOrcids(doc) {
	let authorSections = ZU.xpath(doc, '//ul[@class="authors-string"]/li');
	let notes = [];
	for (let authorSection of authorSections) {
		let authorLink = authorSection.querySelector('a.author-string-href span');
		let orcidLink = authorSection.querySelector('[href*="https://orcid.org"]');
		if (authorLink && orcidLink) {
			let author = authorLink.innerText;
			let orcid = orcidLink.value.match(/\d+-\d+-\d+-\d+x?/i);
			if (!orcid)
				continue;
			notes.push({note: "orcid:" + orcid + '|' + author});
		}
	}
	if (notes.length)
		return notes;

	authorSections = ZU.xpath(doc, '//ul[@class="item authors"]/li');
	for (let authorSection of authorSections) {
		let authorSpans = authorSection.querySelector('span[class="name"]');
		let orcidSpans = authorSection.querySelector('span[class="orcid"]');
		if (authorSpans && orcidSpans) {
		   let author = authorSpans.innerText;
		   let orcidAnchor =  orcidSpans.querySelector('a');
		   if (!orcidAnchor)
			   continue;
		   let orcidUrl = orcidAnchor.href;
		   if (!orcidUrl)
			   continue;
		   let orcid = orcidUrl.match(/\d+-\d+-\d+-\d+x?/i);
		   if (!orcid)
			   continue;
		   notes.push( {note: "orcid:" + orcid + '|' + author});
		}
	}

	return notes;
}


// in some cases (issn == 1799-3121) the article's title is split in 2 parts
function joinTitleAndSubtitle (doc, item) {
	if (item.ISSN == '1799-3121') {
		if (doc.querySelector(".subtitle")) {
			item.title = item.title + ' ' + doc.querySelector(".subtitle").textContent.trim();
		}
	}
	return item.title;
}


function invokeEMTranslator(doc) {
	var translator = Zotero.loadTranslator("web");
	translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
	translator.setDocument(doc);
	translator.setHandler("itemDone", function (t, i) {
		if (i.pages && i.pages.match(/^\d{1,3}–\d{1,3}-\d{1,3}–\d{1,3}/)) {
			let firstandlastpages = i.pages.split('–');
			i.pages = firstandlastpages[0] + '-' + firstandlastpages[2]; // Z.debug(item.pages)
		}
		if (i.ISSN == '2413-3108' && i.pages) {
			// Fix erroneous firstpage in embedded metadata with issue prefix
			i.pages  = i.pages.replace(/(?:\d+\/)?(\d+-\d+)/, "$1");
		}
		if (i.issue === "0") delete i.issue;
		if (i.abstractNote && i.abstractNote.match(/No abstract available/)) delete i.abstractNote;
		let orcids = getOrcids(doc);
		if (orcids.length)
			i.notes.push(...orcids);
		i.tags = splitDotSeparatedKeywords(i);
		i.title = joinTitleAndSubtitle(doc, i);
		// some journal assigns the volume to the date
		if (i.ISSN == '1983-2850') {
			if (i.date == i.volume) {
				let datePath = doc.querySelector('.item.published');
			}
			if (datePath) {
				let itemDate = datePath.innerHTML.match(/.*(\d{4}).*/);
				if (itemDate.length >= 2) {
					i.date = itemDate[1];
				}
			} else i.date = '';
		}
		
		if (['2617-3697', '2660-4418', '2748-6419', '1988-3269', '1804-6444', '2627-6062'].includes(i.ISSN)) {
			if (ZU.xpath(doc, '//meta[@name="DC.Type.articleType"]')) {
				if (ZU.xpath(doc, '//meta[@name="DC.Type.articleType"]')[0].content.match(/(Media reviews)|(Rezensionen)|(Reseñas)/i)) {
					i.tags.push("Book Review");
				}
			}
		}
		
		let orcidNotesNr = 0;
		
		for (let n of i.notes) {
			if (n['note'].match(/orcid:/) != null) {
				orcidNotesNr += 1;
			}
		}
		
		if (orcidNotesNr == 0) {
			//orcid for pica-field 8910
   		let orcidAuthorEntryCaseA = doc.querySelectorAll('.authors');//Z.debug(orcidAuthorEntryCaseA)
  		let orcidAuthorEntryCaseB = doc.querySelectorAll('.authors li');//Z.debug(orcidAuthorEntryCaseB)
  		let orcidAuthorEntryCaseC = doc.querySelectorAll('.authors-string');//Z.debug(orcidAuthorEntryCaseC)
  		let orcidAuthorEntryCaseD = ZU.xpath(doc, '//div[@id="authors"]');
  		// e.g. https://aabner.org/ojs/index.php/beabs/article/view/781
  		if (orcidAuthorEntryCaseA && ['2748-6419', "1804-6444"].includes(i.ISSN)) {
  			for (let a of orcidAuthorEntryCaseA) {
  				if (a && a.innerText.match(/\d+-\d+-\d+-\d+x?/gi)) {
  					let author = a.innerText;//Z.debug(author + '   AAA1')
  					i.notes.push({note: ZU.unescapeHTML(ZU.trimInternal(author)).replace(/https?:\/\/orcid.org\//g, ' | orcid:') + ' | ' + 'taken from website'});
  				}
  			}
  		 }
  		 if (orcidAuthorEntryCaseA && ['2627-6062'].includes(i.ISSN)) {
  			for (let a of orcidAuthorEntryCaseA) {
  				let name_to_orcid = {};
  				let tgs = ZU.xpath(a, './/*[self::strong or self::a]');
  				let tg_nr = 0;
  				for (let t of tgs) {
  					if (t.textContent.match(/orcid/) != null) {
  						name_to_orcid[tgs[tg_nr -1].textContent] = t.textContent.trim();
  						let author = name_to_orcid[tgs[tg_nr -1].textContent];
  						i.notes.push({note: tgs[tg_nr -1].textContent + ZU.unescapeHTML(ZU.trimInternal(t.textContent)).replace(/https?:\/\/orcid.org\//g, ' | orcid:') + ' | ' + 'taken from website'});
  					}
  					tg_nr += 1;
  				}
  			}
  		 }
  		 //e.g. https://aabner.org/ojs/index.php/beabs/article/view/781
  		 if (orcidAuthorEntryCaseA && ['2748-6419'].includes(i.ISSN)) {
  		 	for (let a of orcidAuthorEntryCaseA) {
  				if (a && a.innerHTML.match(/(<span>.*<\/span>.*https?:\/\/orcid\.org\/\d+-\d+-\d+-\d+x?)/gi)) {
  					let author = a.innerHTML.match(/(<span>.*<\/span>.*https?:\/\/orcid\.org\/\d+-\d+-\d+-\d+x?)/gi).toString().replace('<a class="orcidImage" href="', '');//Z.debug(author + '   AAA2')
 					i.notes.push({note: ZU.unescapeHTML(ZU.trimInternal(author)).replace(/https?:\/\/orcid\.org\//g, ' | orcid:') + ' | ' + 'taken from website'});
  				}
  			}
  		}
  		//e.g.  https://ojs3.uni-tuebingen.de/ojs/index.php/beabs/article/view/785
  		if (orcidAuthorEntryCaseA && !orcidAuthorEntryCaseB && i.ISSN !== "2660-7743") {
  			for (let a of orcidAuthorEntryCaseA) {
  				if (a && a.innerText.match(/\d+-\d+-\d+-\d+x?/gi)) {
  					let author = a.innerText;//Z.debug(author + '   AAA1')
  					i.notes.push({note: ZU.unescapeHTML(ZU.trimInternal(author)).replace(/https?:\/\/orcid\.org\//g, ' | orcid:') + ' | ' + 'taken from website'});
  				}
  			}
  		 }
  		 //e.g. https://journal.equinoxpub.com/JSRNC/article/view/19606
  		 if (orcidAuthorEntryCaseA && !orcidAuthorEntryCaseB && i.ISSN !== "2660-7743") {
  		 	for (let a of orcidAuthorEntryCaseA) {
  				if (a && a.innerHTML.match(/(<span>.*<\/span>.*https?:\/\/orcid\.org\/\d+-\d+-\d+-\d+x?)/gi)) {
  					let author = a.innerHTML.match(/(<span>.*<\/span>.*https?:\/\/orcid\.org\/\d+-\d+-\d+-\d+x?)/gi).toString().replace('<a class="orcidImage" href="', '');//Z.debug(author + '   AAA2')
 					i.notes.push({note: ZU.unescapeHTML(ZU.trimInternal(author)).replace(/https?:\/\/orcid\.org\//g, ' | orcid:') + ' | ' + 'taken from website'});
  				}
  			}
  		}
  		//e.g. https://periodicos.uem.br/ojs/index.php/RbhrAnpuh/article/view/52641
  		if (orcidAuthorEntryCaseB) {
			for (let b of orcidAuthorEntryCaseB) {
  				if (b && b.innerText.match(/\d+-\d+-\d+-\d+x?/gi)) {
  					let orcid = b.innerHTML.match(/<a href="https?:\/\/orcid\.org\/([^"]+)/);
  					if (orcid != null){
  					let name = b.innerHTML.match(/<span class="name">([^<]+)<\/span>/)[1];
  					i.notes.push({note: ZU.trimInternal(name) + ' | orcid:' + orcid[1] + ' | ' + 'taken from website'});
  				}
  				}
  			}
  		}
  		
  		if (orcidAuthorEntryCaseC) {
  			for (let c of orcidAuthorEntryCaseC) {
  				if (c && c.innerText.match(/\d+-\d+-\d+-\d+x?/gi)) {
  					let author = c.innerText;//Z.debug(author  + '   CCC')
  					i.notes.push({note: ZU.unescapeHTML(ZU.trimInternal(author)).replace(/https?:\/\/orcid\.org\//g, ' | orcid:') + ' | ' + 'taken from website'});
  				}
  			}
  		}
  		
  		//e.g. https://ote-journal.otwsa-otssa.org.za/index.php/journal/article/view/433
  		if (orcidAuthorEntryCaseC) {
  		 	for (let c of orcidAuthorEntryCaseC) {
  				if (c && c.innerHTML.match(/\d+-\d+-\d+-\d+x?/gi)) {
  					let author = c.innerHTML.match(/(<span>.*<\/span>.*https?:\/\/orcid\.org\/\d+-\d+-\d+-\d+x?)/gi).toString().replace('<a class="orcidImage" href="', '');//Z.debug(author + '   CCC2')
 					i.notes.push({note: ZU.unescapeHTML(ZU.trimInternal(author)).replace(/https?:\/\/orcid\.org\//g, ' | orcid:').replace('+−', '') + ' | ' + 'taken from website'});
  				}
  			}
  		}
		
		if (orcidAuthorEntryCaseD.length != 0) {
			for (let o of ZU.xpath(orcidAuthorEntryCaseD[0], './/div[@class="card-body"]')) {
				if (ZU.xpathText(o, './/a[contains(@href, "orcid")]') != null) {
					let orcid = ZU.trimInternal(ZU.xpathText(o, './/a[contains(@href, "orcid")]'));
					let author = ZU.trimInternal(o.innerHTML.split('&nbsp;')[0]);
					i.notes.push({note: author + ' | orcid:' + orcid.replace(/https?:\/\/orcid\.org\//g, '') + ' | taken from website'});
				}
			}
		}
		}
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
			ZU.processDocuments(articles, invokeEMTranslator);
		});
	} else {
		invokeEMTranslator(doc, url);
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
		"url": "https://jeac.de/ojs/index.php/jeac/article/view/850",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Editorial: Ethik der Nächsten und Fremdenliebe",
				"creators": [
					{
						"firstName": "Dorothea",
						"lastName": "Erbele-Küster",
						"creatorType": "author"
					},
					{
						"firstName": "Michael",
						"lastName": "Roth",
						"creatorType": "author"
					},
					{
						"firstName": "Raphaela Meyer zu",
						"lastName": "Hörste-Bührer",
						"creatorType": "author"
					},
					{
						"firstName": "Esther",
						"lastName": "Kobel",
						"creatorType": "author"
					},
					{
						"firstName": "Ulrich",
						"lastName": "Volp",
						"creatorType": "author"
					},
					{
						"firstName": "Ruben",
						"lastName": "Zimmermann",
						"creatorType": "author"
					}
				],
				"date": "2021/12/11",
				"DOI": "10.25784/jeac.v3i0.850",
				"ISSN": "2627-6062",
				"journalAbbreviation": "1",
				"language": "de",
				"libraryCatalog": "jeac.de",
				"pages": "3-4",
				"publicationTitle": "Journal of Ethics in Antiquity and Christianity",
				"rights": "Copyright (c) 2021 Journal of Ethics in Antiquity and Christianity",
				"shortTitle": "Editorial",
				"url": "https://jeac.de/ojs/index.php/jeac/article/view/850",
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
						"tag": "Ethik in Antike und Christentum"
					},
					{
						"tag": "Fremdenliebe"
					},
					{
						"tag": "Imigration"
					},
					{
						"tag": "Nächstenliebe"
					}
				],
				"notes": [
					{
						"note": "Raphaela Meyer zu Hörste-Bührer | orcid:0000-0002-7458-9466 | taken from website"
					},
					{
						"note": "Ulrich Volp | orcid:0000-0003-2510-0879 | taken from website"
					},
					{
						"note": "Ruben Zimmermann | orcid:0000-0002-1620-4396 | taken from website"
					}
				],
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
						"note": "Nélida Naveros Córdova | orcid:0000-0003-3280-5914 | taken from website"
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
						"note": "Jan Martijn Abrahamse  | orcid:0000-0003-3726-271X | taken from website"
					}
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
