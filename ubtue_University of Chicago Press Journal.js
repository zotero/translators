{
	"translatorID": "338ea029-1536-4575-ba9b-42094095f65d",
	"label": "ubtue_University of Chicago Press Journal",
	"creator": "Timotheus Kim",
	"target": "https://www\\.journals\\.uchicago\\.edu/doi|toc",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 80,
	"inRepository": false,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2020-08-21 13:44:44"
}

/*
	***** BEGIN LICENSE BLOCK *****
	Copyright © 2020 Universitätsbibliothek Tübingen.  All rights reserved.
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
	if (url.includes('/doi/')) return "journalArticle";
		else if (url.includes('/toc/') && getSearchResults(doc)) return "multiple";
	else return false;
}

function getSearchResults(doc, checkOnly, extras) {
	var articles = {};
	var container = doc.getElementsByName('frmSearchResults')[0]
		|| doc.getElementsByName('frmAbs')[0];
	if (!container) {
		Z.debug('Atypon: multiples container not found.');
		return false;
	}
	var rows = container.getElementsByClassName('articleEntry'),
		found = false,
		doiLink = 'a[contains(@href, "/doi/abs/") or contains(@href, "/doi/abstract/") or '
			+ 'contains(@href, "/doi/full/") or contains(@href, "/doi/book/")]';
	for (var i = 0; i<rows.length; i++) {
		var title = rows[i].getElementsByClassName('art_title')[0];
		if (!title) continue;
		title = ZU.trimInternal(title.textContent);
		
		var urlRow = rows[i];
		var url = ZU.xpathText(urlRow, '(.//' + doiLink + ')[1]/@href');
		
		if (!url) {
			// e.g. http://pubs.rsna.org/toc/radiographics/toc/33/7 shows links in adjacent div
			urlRow = rows[i].nextElementSibling;
			if (!urlRow || urlRow.classList.contains('articleEntry')) continue;
			
			url = ZU.xpathText(urlRow, '(.//' + doiLink + ')[1]/@href');
		}
		if (!url) continue;
		
		if (checkOnly) return true;
		found = true;
		
		if (extras) {
			extras[url] = { pdf: buildPdfUrl(url, urlRow) };
		}
		
		articles[url] = title;
	}
	
	if (!found){
		Z.debug("Trying an alternate multiple format");
		var rows = container.getElementsByClassName("item-details");
		for (var i = 0; i<rows.length; i++) {
			var title = ZU.xpathText(rows[i], './h3');
			if (!title) continue;
			title = ZU.trimInternal(title);
			
			var url = ZU.xpathText(rows[i], '(.//ul[contains(@class, "icon-list")]/li/'
				+ doiLink + ')[1]/@href');
			if (!url) continue;
			
			if (checkOnly) return true;
			found = true;
			
			if (extras) {
				extras[url] = { pdf: buildPdfUrl(url, rows[i]) };
			}
			
			articles[url] = title;
		}
	}
	
	return found ? articles : false;
}

// Keep this in line with target regexp
var replURLRegExp = /\/doi\/((?:abs|abstract|full|figure|ref|citedby|book)\/)?/;

function buildPdfUrl(url, root) {
	if (!replURLRegExp.test(url)) return false; // The whole thing is probably going to fail anyway
	
	var pdfPaths = ['/doi/pdf/', '/doi/pdfplus/'];
	for (var i=0; i<pdfPaths.length; i++) {
		if (ZU.xpath(root, './/a[contains(@href, "' + pdfPaths[i] + '")]').length) {
			return url.replace(replURLRegExp, pdfPaths[i]);
		}
	}
	
	Z.debug('PDF link not found.');
	if (root.nodeType != 9 /*DOCUMENT_NODE*/) {
		Z.debug('Available links:');
		var links = root.getElementsByTagName('a');
		if (!links.length) Z.debug('No links');
		for (var i=0; i<links.length; i++) {
			Z.debug(links[i].href);
		}
	}
	
	return false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		var extras = {};
		Zotero.selectItems(getSearchResults(doc, false, extras), function (items) {
			if (!items) {
				return true;
			}
			var articles = [];
			for (var itemurl in items) {
				articles.push({
					url: itemurl.replace(/\?prev.+/, ""),
					extras: extras[itemurl]
				});
			}
			
			fetchArticles(articles);
		});

	} else {
		scrape(doc, url, {pdf: buildPdfUrl(url, doc)});
	}
}

function fixCase(str, titleCase) {
	if (str.toUpperCase() != str) return str;
	
	if (titleCase) {
		return ZU.capitalizeTitle(str, true);
	}
	
	return str.charAt(0) + str.substr(1).toLowerCase();
}

function fetchArticles(articles) {
	if (!articles.length) return;
	
	var article = articles.shift();
	ZU.processDocuments(article.url, function(doc, url) {
		scrape(doc, url, article.extras);
	},
	function() {
		if (articles.length) fetchArticles(articles);
	});
}

function scrape(doc, url, extras) {
	url = url.replace(/[?#].*/, "");
	var doi = url.match(/10\.[^?#]+/)[0];
	var citationurl = url.replace(replURLRegExp, "/action/showCitFormats?doi=");
	var abstract = doc.getElementsByClassName('abstractSection')[0];
	var tags = ZU.xpath(doc, '//meta[@name="dc.Subject"]');
	Z.debug("Citation URL: " + citationurl);
	ZU.processDocuments(citationurl, function(citationDoc){
		var filename = citationDoc.evaluate('//form//input[@name="downloadFileName"]', citationDoc, null, XPathResult.ANY_TYPE, null).iterateNext().value;
		Z.debug("Filename: " + filename);
		var get = '/action/downloadCitation';
		var post = 'doi=' + doi + '&downloadFileName=' + filename + '&format=ris&direct=true&include=cit';
		ZU.doPost(get, post, function (text) {
			//Z.debug(text);
			var translator = Zotero.loadTranslator("import");
			// Calling the RIS translator
			translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
			translator.setString(text);
			translator.setHandler("itemDone", function (obj, item) {
				// Sometimes we get titles and authors in all caps
				item.title = fixCase(item.title);
				
				for (var i=0; i<item.creators.length; i++) {
					item.creators[i].lastName = fixCase(item.creators[i].lastName, true);
					if (item.creators[i].firstName) {
						item.creators[i].firstName = fixCase(item.creators[i].firstName, true);
					}
				}
				
				item.url = url;
				item.notes = [];
				//ubtue:scrape tags from dc.Subject and split
				for (var i in tags){
					//let tags[0].content = tags[0].content.split(';'))
					let tagentry = tags[i].content.split(/;/);
					for (var v in tagentry) {
						item.tags.push(tagentry[v]);	
					}
				}
				
				if (abstract) {
					// Drop "Abstract" prefix
					// This is not excellent, since some abstracts could
					// conceivably begin with the word "abstract"
					item.abstractNote = abstract.textContent
						.replace(/^[^\w\d]*abstract\s*/i, '');
				}
				
				item.attachments = [];
				if (extras.pdf) {
					item.attachments.push({
						url: extras.pdf,
						title: "Full Text PDF",
						mimeType: "application/pdf"
					});
				}
				
				item.attachments.push({
					document: doc,
					title: "Snapshot",
					mimeType: "text/html"
				});
				item.libraryCatalog = url.replace(/^https?:\/\/(?:www\.)?/, '')
					.replace(/[\/:].*/, '') + " (Atypon)";
				item.complete();
			});
			translator.translate();
		});
	});
}

