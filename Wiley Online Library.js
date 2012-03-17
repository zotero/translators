{
	"translatorID": "fe728bc9-595a-4f03-98fc-766f1d8d0936",
	"label": "Wiley Online Library",
	"creator": "Sean Takats, Michael Berkowitz, Avram Lyon and Aurimas Vinckevicius",
	"target": "^https?://onlinelibrary\\.wiley\\.com[^\\/]*/(?:book|doi|advanced/search)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcs",
	"lastUpdated": "2012-03-17 02:25:22"
}

/*
   Wiley Online Translator
   Copyright (C) 2011 CHNM, Avram Lyon and Aurimas Vinckevicius

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

function addCreators(item, creatorType, creators) {
	if( typeof(creators) == 'string' ) {
		creators = [creators];
	} else if( !(creators instanceof Array) ) {
		return;
	}

	for(var i=0, n=creators.length; i<n; i++) {
		item.creators.push(ZU.cleanAuthor(creators[i], creatorType, false));
	}
}

function getAuthorName(text) {
	text = text.replace(/\b[a-z]+\b/g,'');	//anything that does not contain
											//an upper case letter is not a name

	text = text.replace(/\b(PhD|MA)\b/gi,'');	//remove salutations

	return text.trim();
}

function scrape(doc, url, pdfUrl) {
	var itemType = detectWeb(doc,url);

	if( itemType == 'book' ) {
		var title = doc.getElementById('productTitle');
		if( !title ) return false;

		var newItem = new Zotero.Item('book');
		newItem.title = ZU.capitalizeTitle(title.textContent);

		var data = ZU.xpath(doc, '//div[@id="metaData"]/p');
		var dataRe = /^(.+?):\s*(.+?)\s*$/;
		var match;
		var isbn = new Array();
		for( var i=0, n=data.length; i<n; i++) {
			match = dataRe.exec(data[i].textContent);
			if(!match) continue;

			switch(match[1].trim().toLowerCase()) {
				case 'author(s)':
					addCreators(newItem, 'author', match[2].split(', '));
					break;
				case 'series editor(s)':
					addCreators(newItem, 'seriesEditor', match[2].split(', '));
					break;
				case 'editor(s)':
					addCreators(newItem, 'editor', match[2].split(', '));
					break;
				case 'published online':
					var date = ZU.strToDate(match[2]);
					date.part = null;
					newItem.date = ZU.formatDate(date);
					break;
				case 'print isbn':
				case 'online isbn':
					isbn.push(match[2]);
					break;
				case 'doi':
					newItem.DOI = match[2];
					break;
				case 'book series':
					newItem.series = match[2];
			}
		}

		newItem.ISBN = isbn.join(', ');
		newItem.rights = ZU.xpathText(doc, '//div[@id="titleMeta"]/p[@class="copyright"]');
		newItem.url = url;
		newItem.abstractNote = ZU.trimInternal(
				ZU.xpathText(doc, '//div[@id="homepageContent"]\
					/h6[normalize-space(text())="About The Product"]\
					/following-sibling::p', null, "\n") || "");
		newItem.accessDate = 'CURRENT_TIMESTAMP';

		newItem.complete();
	} else {
		var translator = Zotero.loadTranslator('web');
		//use Embedded Metadata
		translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
		translator.setDocument(doc);
		translator.setHandler('itemDone', function(obj, item) {
			if( itemType == 'bookSection' ) {
				var authors = ZU.xpath(doc, '//ol[@id="authors"]/li/node()[1]');
				for(var i=0, n=authors.length; i<n; i++) {
					item.creators.push(
						ZU.cleanAuthor( getAuthorName(authors[i].textContent),
											'author',false) );
				}
				item.rights = ZU.xpathText(doc, '//p[@id="copyright"]');

				//this is not great for summary, but will do for now
				item.abstractNote = ZU.xpathText(doc, '//div[@id="abstract"]/div[@class="para"]//p', null, "\n");
			} else {
				var keywords = ZU.xpathText(doc, '//meta[@name="citation_keywords"]/@content');
				if(keywords) {
					item.tags = keywords.split(', ');
				}
				item.rights = ZU.xpathText(doc, '//div[@id="titleMeta"]//p[@class="copyright"]');
				item.abstractNote = ZU.xpathText(doc, '//div[@id="abstract"]/div[@class="para"]', null, "\n");
			}

			//remove pdf attachments
			for(var i=0, n=item.attachments.length; i<n; i++) {
				if(item.attachments[i].mimeType == 'application/pdf') {
					item.attachments.splice(i,1);
					i--;
					n--;
				}
			}

			//fetch pdf url. There seems to be some magic value that must be sent
			// with the request
			if(!pdfUrl) {
				var u = ZU.xpathText(doc, '//meta[@name="citation_pdf_url"]/@content');
				if(u) {
					ZU.doGet(u, function(text) {
						var m = text.match(/<iframe id="pdfDocument"[^>]+?src="([^"]+)"/i);
						if(m) {
							item.attachments.push({url: m[1], title: 'Full Text PDF', mimeType: 'application/pdf'});
						}
						item.complete();
					});
				} else {
					item.complete();
				}
			} else {
				item.attachments.push({url: pdfUrl, title: 'Full Text PDF', mimeType: 'application/pdf'});
				item.complete();
			}
		});
		translator.translate();
	}
}

function detectWeb(doc, url) {	
	if( url.indexOf('/issuetoc') != -1 ||
		url.indexOf('/results') != -1 ) {
		return 'multiple';
	} else {
		if( url.indexOf('/book/') != -1 ) {
			return 'book';
		} else if ( ZU.xpath(doc, '//meta[@name="citation_book_title"]').length ) {
			return 'bookSection';
		} else {
			return 'journalArticle';
		}
	}
}

function doWeb(doc, url) {
	var type = detectWeb(doc, url);
	if(type == "multiple") {
		var articles = ZU.xpath(doc, '//li//div[@class="citation article" or starts-with(@class,"citation")]/a');
		var availableItems = new Object();
		for(var i=0, n=articles.length; i<n; i++) {
			availableItems[articles[i].href] = ZU.trimInternal(articles[i].textContent.trim());
		}

		Zotero.selectItems(availableItems, function(selectedItems) {
			if(!selectedItems) return true;

			var urls = new Array();
			for (var i in selectedItems) {
				urls.push(i);
			}

			ZU.processDocuments(urls, scrape);
		});
	} else { //single article
		if (url.indexOf("/pdf") != -1) {
			//redirect needs to work where URL end in /pdf and where it end in /pdf/something
			url = url.replace(/\/pdf(.+)?$/,'/abstract');
			//Zotero.debug("Redirecting to abstract page: "+url);
			//grab pdf url before leaving
			var pdfUrl = ZU.xpathText(doc, '//div[@iframe="pdfDocument"]/@src');
			ZU.processDocuments(url, function(doc) { scrape(doc, doc.location.href, pdfUrl) });
		} else if(type != 'book' &&
				url.indexOf('abstract') == -1 &&
				!ZU.xpathText(doc, '//div[@id="abstract"]/div[@class="para"]')) {
			//redirect to abstract or summary so we can scrape that
			if(type == 'bookSection') {
				url = url.replace(/\/[^?#\/]+(?:[?#].*)?$/, '/summary');
			} else {
				url = url.replace(/\/[^?#\/]+(?:[?#].*)?$/, '/abstract');
			}
			ZU.processDocuments(url, function(doc) { scrape(doc, doc.location.href) });
		} else {
			scrape(doc, url);
		}
	}
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://onlinelibrary.wiley.com/advanced/search/results/reentry?scope=allContent&query=zotero&inTheLastList=6&queryStringEntered=false&searchRowCriteria[0].fieldName=all-fields&searchRowCriteria[0].booleanConnector=and&searchRowCriteria[1].fieldName=all-fields&searchRowCriteria[1].booleanConnector=and&searchRowCriteria[2].fieldName=all-fields&searchRowCriteria[2].booleanConnector=and&start=1&resultsPerPage=20&ordering=relevancy",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://onlinelibrary.wiley.com/doi/10.1002/9781118269381.notes/summary",
		"items": [
			{
				"itemType": "bookSection",
				"creators": [
					{
						"firstName": "Curtis J.",
						"lastName": "Bonk",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Snapshot"
					},
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"title": "Endnotes",
				"bookTitle": "The World is Open",
				"publisher": "Jossey‐Bass",
				"ISBN": "9781118269381",
				"DOI": "10.1002/9781118269381.notes",
				"language": "en",
				"pages": "427-467",
				"url": "http://onlinelibrary.wiley.com/doi/10.1002/9781118269381.notes/summary",
				"accessDate": "CURRENT_TIMESTAMP",
				"libraryCatalog": "onlinelibrary.wiley.com",
				"rights": "Copyright © 2009 Curtis J. Bonk. All rights reserved."
			}
		]
	},
	{
		"type": "web",
		"url": "http://onlinelibrary.wiley.com/doi/10.1111/jgi.2004.19.issue-s1/issuetoc",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://onlinelibrary.wiley.com/book/10.1002/9783527610853",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"firstName": "Dietrich",
						"lastName": "Papenfuß",
						"creatorType": "editor"
					},
					{
						"firstName": "Dieter",
						"lastName": "Lüst",
						"creatorType": "editor"
					},
					{
						"firstName": "Wolfgang P.",
						"lastName": "Schleich",
						"creatorType": "editor"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"title": "100 Years Werner Heisenberg: Works and Impact",
				"date": "November 29, 2007",
				"DOI": "10.1002/9783527610853",
				"ISBN": "9783527403929, 9783527610853",
				"rights": "Copyright © 2002 Wiley-VCH Verlag GmbH",
				"url": "http://onlinelibrary.wiley.com/book/10.1002/9783527610853",
				"abstractNote": "Over 40 renowned scientists from all around the world discuss the work and influence of Werner Heisenberg. The papers result from the symposium held by the Alexander von Humboldt-Stiftung on the occasion of the 100th anniversary of Heisenberg's birth, one of the most important physicists of the 20th century and cofounder of modern-day quantum mechanics. Taking atomic and laser physics as their starting point, the scientists illustrate the impact of Heisenberg's theories on astroparticle physics, high-energy physics and string theory right up to processing quantum information.",
				"accessDate": "CURRENT_TIMESTAMP",
				"libraryCatalog": "Wiley Online Library",
				"shortTitle": "100 Years Werner Heisenberg"
			}
		]
	},
	{
		"type": "web",
		"url": "http://onlinelibrary.wiley.com/doi/10.1002/9781444304794.ch1/summary",
		"items": [
			{
				"itemType": "bookSection",
				"creators": [
					{
						"firstName": "Tatjana",
						"lastName": "Pavlović",
						"creatorType": "author"
					},
					{
						"firstName": "Inmaculada",
						"lastName": "Alvarez",
						"creatorType": "author"
					},
					{
						"firstName": "Rosana",
						"lastName": "Blanco-Cano",
						"creatorType": "author"
					},
					{
						"firstName": "Anitra",
						"lastName": "Grisales",
						"creatorType": "author"
					},
					{
						"firstName": "Alejandra",
						"lastName": "Osorio",
						"creatorType": "author"
					},
					{
						"firstName": "Alejandra",
						"lastName": "Sá",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"silent cinema and its pioneers (1906–1930)",
					"Ángel García Cardona's El ciego de aldea (1906)",
					"Ángel García Cardona and Antonio Cuesta",
					"Ricardo Baños and Albert Marro's Don Pedro el Cruel (1911)",
					"Fructuós Gelabert's Amor que mata (1909)",
					"three films ‐ part of “the preliminary industrial and expressive framework for Spain's budding cinema”",
					"Directors (Life and Works) ‐ Ángel García Cardona and Antonio Cuesta13",
					"Ricardo Baños",
					"Florián Rey's La aldea maldita (1930)",
					"Florián Rey (Antonio Martínez de Castillo)",
					"Fructuós Gelabert ‐ made the first Spanish fiction film",
					"Riña en un café",
					"1897"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Snapshot"
					}
				],
				"title": "Silent Cinema and its Pioneers (1906–1930)",
				"bookTitle": "100 Years of Spanish Cinema",
				"publisher": "Wiley‐Blackwell",
				"ISBN": "9781444304794",
				"DOI": "10.1002/9781444304794.ch1",
				"language": "en",
				"pages": "1-20",
				"url": "http://onlinelibrary.wiley.com/doi/10.1002/9781444304794.ch1/summary",
				"accessDate": "CURRENT_TIMESTAMP",
				"libraryCatalog": "onlinelibrary.wiley.com",
				"rights": "Copyright © 2009 Tatjana Pavlović, Inmaculada Alvarez, Rosana Blanco-Cano, Anitra Grisales, Alejandra Osorio, and Alejandra Sánchez",
				"abstractNote": "This chapter contains sections titled: \nHistorical and Political Overview of the Period\nContext11\nFilm Scenes: Close Readings\nDirectors (Life and Works)\nCritical Commentary"
			}
		]
	},
	{
		"type": "web",
		"url": "http://onlinelibrary.wiley.com/book/10.1002/9781444390124",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"firstName": "Anthony C.",
						"lastName": "Thiselton",
						"creatorType": "author"
					},
					{
						"firstName": "John",
						"lastName": "Sawyer",
						"creatorType": "seriesEditor"
					},
					{
						"firstName": "Christopher",
						"lastName": "Rowland",
						"creatorType": "seriesEditor"
					},
					{
						"firstName": "Judith",
						"lastName": "Kovacs",
						"creatorType": "seriesEditor"
					},
					{
						"firstName": "David M.",
						"lastName": "Gunn",
						"creatorType": "seriesEditor"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"title": "1 & 2 Thessalonians: Through the Centuries",
				"date": "March 24, 2011",
				"DOI": "10.1002/9781444390124",
				"ISBN": "9781405196826, 9781444390124",
				"rights": "Copyright © 2011 Anthony C. Thiselton",
				"url": "http://onlinelibrary.wiley.com/book/10.1002/9781444390124",
				"accessDate": "CURRENT_TIMESTAMP",
				"libraryCatalog": "Wiley Online Library",
				"shortTitle": "1 & 2 Thessalonians"
			}
		]
	},
	{
		"type": "web",
		"url": "http://onlinelibrary.wiley.com/book/10.1002/9780470320419",
		"items": [
			{
				"itemType": "book",
				"creators": [
					{
						"firstName": "William",
						"lastName": "Smothers",
						"creatorType": "editor"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [],
				"title": "14th Automotive Materials Conference: Ceramic Engineering and Science Proceedings, Volume 8, Issue 9/10",
				"date": "March 27, 2008",
				"DOI": "10.1002/9780470320419",
				"series": "Ceramic Engineering and Science Proceedings",
				"ISBN": "9780470374740, 9780470320419",
				"rights": "Copyright © 1987 The American Ceramic Society, Inc.",
				"url": "http://onlinelibrary.wiley.com/book/10.1002/9780470320419",
				"abstractNote": "This volume is part of the Ceramic Engineering and Science Proceeding (CESP) series. This series contains a collection of papers dealing with issues in both traditional ceramics (i.e., glass, whitewares, refractories, and porcelain enamel) and advanced ceramics. Topics covered in the area of advanced ceramic include bioceramics, nanomaterials, composites, solid oxide fuel cells, mechanical properties and structural design, advanced ceramic coatings, ceramic armor, porous ceramics, and more.",
				"accessDate": "CURRENT_TIMESTAMP",
				"libraryCatalog": "Wiley Online Library",
				"shortTitle": "14th Automotive Materials Conference"
			}
		]
	},
	{
		"type": "web",
		"url": "http://onlinelibrary.wiley.com/doi/10.1002/pmic.201100327/abstract",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Zhenming",
						"lastName": "An",
						"creatorType": "author"
					},
					{
						"firstName": "Yudan",
						"lastName": "Chen",
						"creatorType": "author"
					},
					{
						"firstName": "John M.",
						"lastName": "Koomen",
						"creatorType": "author"
					},
					{
						"firstName": "David J.",
						"lastName": "Merkler",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"α‐Amidated peptide",
					"Post‐translational modification",
					"Spectral pairing",
					"Technology"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Snapshot"
					},
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"title": "A mass spectrometry‐based method to screen for α‐amidated peptides",
				"date": "2012/01/01",
				"publicationTitle": "PROTEOMICS",
				"volume": "12",
				"issue": "2",
				"publisher": "WILEY‐VCH Verlag",
				"DOI": "10.1002/pmic.201100327",
				"language": "en",
				"pages": "173-182",
				"ISSN": "1615-9861",
				"url": "http://onlinelibrary.wiley.com/doi/10.1002/pmic.201100327/abstract",
				"accessDate": "CURRENT_TIMESTAMP",
				"libraryCatalog": "onlinelibrary.wiley.com",
				"rights": "Copyright © 2012 WILEY-VCH Verlag GmbH & Co. KGaA, Weinheim",
				"abstractNote": "Amidation is a post-translational modification found at the C-terminus of ∼50% of all neuropeptide hormones. Cleavage of the Cα–N bond of a C-terminal glycine yields the α-amidated peptide in a reaction catalyzed by peptidylglycine α-amidating monooxygenase (PAM). The mass of an α-amidated peptide decreases by 58 Da relative to its precursor. The amino acid sequences of an α-amidated peptide and its precursor differ only by the C-terminal glycine meaning that the peptides exhibit similar RP-HPLC properties and tandem mass spectral (MS/MS) fragmentation patterns. Growth of cultured cells in the presence of a PAM inhibitor ensured the coexistence of α-amidated peptides and their precursors. A strategy was developed for precursor and α-amidated peptide pairing (PAPP): LC-MS/MS data of peptide extracts were scanned for peptide pairs that differed by 58 Da in mass, but had similar RP-HPLC retention times. The resulting peptide pairs were validated by checking for similar fragmentation patterns in their MS/MS data prior to identification by database searching or manual interpretation. This approach significantly reduced the number of spectra requiring interpretation, decreasing the computing time required for database searching and enabling manual interpretation of unidentified spectra. Reported here are the α-amidated peptides identified from AtT-20 cells using the PAPP method."
			}
		]
	},
	{
		"type": "web",
		"url": "http://onlinelibrary.wiley.com/doi/10.1002/pmic.201100327/full",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Zhenming",
						"lastName": "An",
						"creatorType": "author"
					},
					{
						"firstName": "Yudan",
						"lastName": "Chen",
						"creatorType": "author"
					},
					{
						"firstName": "John M.",
						"lastName": "Koomen",
						"creatorType": "author"
					},
					{
						"firstName": "David J.",
						"lastName": "Merkler",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"α‐Amidated peptide",
					"Post‐translational modification",
					"Spectral pairing",
					"Technology"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Snapshot"
					},
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"title": "A mass spectrometry‐based method to screen for α‐amidated peptides",
				"date": "2012/01/01",
				"publicationTitle": "PROTEOMICS",
				"volume": "12",
				"issue": "2",
				"publisher": "WILEY‐VCH Verlag",
				"DOI": "10.1002/pmic.201100327",
				"language": "en",
				"pages": "173-182",
				"ISSN": "1615-9861",
				"url": "http://onlinelibrary.wiley.com/doi/10.1002/pmic.201100327/full",
				"accessDate": "CURRENT_TIMESTAMP",
				"libraryCatalog": "onlinelibrary.wiley.com",
				"rights": "Copyright © 2012 WILEY-VCH Verlag GmbH & Co. KGaA, Weinheim",
				"abstractNote": "Amidation is a post-translational modification found at the C-terminus of ∼50% of all neuropeptide hormones. Cleavage of the Cα–N bond of a C-terminal glycine yields the α-amidated peptide in a reaction catalyzed by peptidylglycine α-amidating monooxygenase (PAM). The mass of an α-amidated peptide decreases by 58 Da relative to its precursor. The amino acid sequences of an α-amidated peptide and its precursor differ only by the C-terminal glycine meaning that the peptides exhibit similar RP-HPLC properties and tandem mass spectral (MS/MS) fragmentation patterns. Growth of cultured cells in the presence of a PAM inhibitor ensured the coexistence of α-amidated peptides and their precursors. A strategy was developed for precursor and α-amidated peptide pairing (PAPP): LC-MS/MS data of peptide extracts were scanned for peptide pairs that differed by 58 Da in mass, but had similar RP-HPLC retention times. The resulting peptide pairs were validated by checking for similar fragmentation patterns in their MS/MS data prior to identification by database searching or manual interpretation. This approach significantly reduced the number of spectra requiring interpretation, decreasing the computing time required for database searching and enabling manual interpretation of unidentified spectra. Reported here are the α-amidated peptides identified from AtT-20 cells using the PAPP method."
			}
		]
	},
	{
		"type": "web",
		"url": "http://onlinelibrary.wiley.com/doi/10.1002/pmic.201100327/references",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Zhenming",
						"lastName": "An",
						"creatorType": "author"
					},
					{
						"firstName": "Yudan",
						"lastName": "Chen",
						"creatorType": "author"
					},
					{
						"firstName": "John M.",
						"lastName": "Koomen",
						"creatorType": "author"
					},
					{
						"firstName": "David J.",
						"lastName": "Merkler",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"α‐Amidated peptide",
					"Post‐translational modification",
					"Spectral pairing",
					"Technology"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Snapshot"
					},
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"title": "A mass spectrometry‐based method to screen for α‐amidated peptides",
				"date": "2012/01/01",
				"publicationTitle": "PROTEOMICS",
				"volume": "12",
				"issue": "2",
				"publisher": "WILEY‐VCH Verlag",
				"DOI": "10.1002/pmic.201100327",
				"language": "en",
				"pages": "173-182",
				"ISSN": "1615-9861",
				"url": "http://onlinelibrary.wiley.com/doi/10.1002/pmic.201100327/abstract",
				"accessDate": "CURRENT_TIMESTAMP",
				"libraryCatalog": "onlinelibrary.wiley.com",
				"rights": "Copyright © 2012 WILEY-VCH Verlag GmbH & Co. KGaA, Weinheim",
				"abstractNote": "Amidation is a post-translational modification found at the C-terminus of ∼50% of all neuropeptide hormones. Cleavage of the Cα–N bond of a C-terminal glycine yields the α-amidated peptide in a reaction catalyzed by peptidylglycine α-amidating monooxygenase (PAM). The mass of an α-amidated peptide decreases by 58 Da relative to its precursor. The amino acid sequences of an α-amidated peptide and its precursor differ only by the C-terminal glycine meaning that the peptides exhibit similar RP-HPLC properties and tandem mass spectral (MS/MS) fragmentation patterns. Growth of cultured cells in the presence of a PAM inhibitor ensured the coexistence of α-amidated peptides and their precursors. A strategy was developed for precursor and α-amidated peptide pairing (PAPP): LC-MS/MS data of peptide extracts were scanned for peptide pairs that differed by 58 Da in mass, but had similar RP-HPLC retention times. The resulting peptide pairs were validated by checking for similar fragmentation patterns in their MS/MS data prior to identification by database searching or manual interpretation. This approach significantly reduced the number of spectra requiring interpretation, decreasing the computing time required for database searching and enabling manual interpretation of unidentified spectra. Reported here are the α-amidated peptides identified from AtT-20 cells using the PAPP method."
			}
		]
	},
	{
		"type": "web",
		"url": "http://onlinelibrary.wiley.com/doi/10.1002/pmic.201100327/citedby",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Zhenming",
						"lastName": "An",
						"creatorType": "author"
					},
					{
						"firstName": "Yudan",
						"lastName": "Chen",
						"creatorType": "author"
					},
					{
						"firstName": "John M.",
						"lastName": "Koomen",
						"creatorType": "author"
					},
					{
						"firstName": "David J.",
						"lastName": "Merkler",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"α‐Amidated peptide",
					"Post‐translational modification",
					"Spectral pairing",
					"Technology"
				],
				"seeAlso": [],
				"attachments": [
					{
						"title": "Snapshot"
					},
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"title": "A mass spectrometry‐based method to screen for α‐amidated peptides",
				"date": "2012/01/01",
				"publicationTitle": "PROTEOMICS",
				"volume": "12",
				"issue": "2",
				"publisher": "WILEY‐VCH Verlag",
				"DOI": "10.1002/pmic.201100327",
				"language": "en",
				"pages": "173-182",
				"ISSN": "1615-9861",
				"url": "http://onlinelibrary.wiley.com/doi/10.1002/pmic.201100327/abstract",
				"accessDate": "CURRENT_TIMESTAMP",
				"libraryCatalog": "onlinelibrary.wiley.com",
				"rights": "Copyright © 2012 WILEY-VCH Verlag GmbH & Co. KGaA, Weinheim",
				"abstractNote": "Amidation is a post-translational modification found at the C-terminus of ∼50% of all neuropeptide hormones. Cleavage of the Cα–N bond of a C-terminal glycine yields the α-amidated peptide in a reaction catalyzed by peptidylglycine α-amidating monooxygenase (PAM). The mass of an α-amidated peptide decreases by 58 Da relative to its precursor. The amino acid sequences of an α-amidated peptide and its precursor differ only by the C-terminal glycine meaning that the peptides exhibit similar RP-HPLC properties and tandem mass spectral (MS/MS) fragmentation patterns. Growth of cultured cells in the presence of a PAM inhibitor ensured the coexistence of α-amidated peptides and their precursors. A strategy was developed for precursor and α-amidated peptide pairing (PAPP): LC-MS/MS data of peptide extracts were scanned for peptide pairs that differed by 58 Da in mass, but had similar RP-HPLC retention times. The resulting peptide pairs were validated by checking for similar fragmentation patterns in their MS/MS data prior to identification by database searching or manual interpretation. This approach significantly reduced the number of spectra requiring interpretation, decreasing the computing time required for database searching and enabling manual interpretation of unidentified spectra. Reported here are the α-amidated peptides identified from AtT-20 cells using the PAPP method."
			}
		]
	}
]
/** END TEST CASES **/