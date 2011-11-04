{
	"translatorID": "cb9e794e-7a65-47cd-90f6-58cdd191e8b0",
	"label": "Frontiers",
	"creator": "Jason Friedman",
	"target": "^https?://www\\.frontiersin\\.org.*/",
	"minVersion": "2.0.10",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "g",
	"lastUpdated": "2011-11-01 22:41:09"
}

/*
   Frontiers translator 
   Copyright (C) 2009-2011 Jason Friedman, write.to.jason@gmail.com

   This program is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 3 of the License, or
   (at your option) any later version.

   This program is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

function detectWeb(doc, url) {
	
	 if (url.indexOf("abstract") != -1) {
		return "journalArticle";
	}
	else if (url.indexOf("full") != -1) {
		return "journalArticle";
	}
	else if (url.indexOf("SearchSite") != -1) {
		return "multiple";
	}
	// other pages on the site may contain articles
	else
		return "multiple";
		
	
}

function doWeb(doc, url) {
	var articles = new Array();
	
	// individual article
	 if (url.indexOf("abstract") != -1) {
		// For some strange reason, replacing /abstract with /pdf/abstract will load a document that has a link to the pdf . . . 
		if (!url.match(/pdf/) && url.match(/abstract$/)) {
			url = url.replace('abstract','pdf/abstract');
		}
		articles = [url];
		
		Zotero.Utilities.processDocuments(articles, scrape, function() {Zotero.done();});
		Zotero.wait();
	}
	else if(url.indexOf("full")!= -1) {
		// For some strange reason, replacing /abstract with /pdf/abstract will load a document that has a link to the pdf . . . 
		if (!url.match(/pdf/) && url.match(/full$/)) {
			url = url.replace('full','pdf/full');
		}
		articles = [url];
		
		Zotero.Utilities.processDocuments(articles, scrape, function() {Zotero.done();});
		Zotero.wait();
	}
	// search results / other page
	else {
		var namespace = doc.documentElement.namespaceURI;
		var nsResolver = namespace ? function(prefix) {
		if (prefix == 'x') return namespace; else return null;
		} : null;	
			
		var items = new Object();
		var noitems = 1;
		
				var links = doc.evaluate('//div[@class="ArchiveList"]/div/p/a', doc, nsResolver, XPathResult.ANY_TYPE, null);
		while (link = links.iterateNext()) {
			var url = link.href;
			if (url.indexOf("abstract")!= -1) {
				if(url.match(/abstract$/))
					url = url.replace('abstract','pdf/abstract');
				items[url] = link.textContent;
				noitems=0;
			}
			else if (url.indexOf("full")!= -1) {
				if(url.match(/full$/)) 
					url = url.replace('full','pdf/full');
				items[url] = link.textContent;
				noitems=0;
			}

		}
		
		
		var links = doc.evaluate('//div/div/h4/a', doc, nsResolver, XPathResult.ANY_TYPE, null);
		while (link = links.iterateNext()) {
			var url = link.href;
			if (url.indexOf("abstract")!= -1) {
				if(url.match(/abstract$/))
					url = url.replace('abstract','pdf/abstract');
				items[url] = link.textContent;
				noitems=0;
			}
			else if (url.indexOf("full")!= -1) {
				if(url.match(/full$/)) 
					url = url.replace('full','pdf/full');
				items[url] = link.textContent;
				noitems=0;
			}
		}
		
		if (noitems)
			return true;
		
		items = Zotero.selectItems(items);
		
		for (var i in items) {
			articles.push(i);
		}
		
		if (!items)
			return true;
			
		Zotero.Utilities.processDocuments(articles, scrape, function() {Zotero.done();});
		Zotero.wait();
	}
}

function scrape(doc,url) {
	var namespace = doc.documentElement.namespaceURI;
	var nsResolver = namespace ? function(prefix) {
		if (prefix == 'x') return namespace; else return null;
	} : null;	
	
	var newItem = new Zotero.Item("journalArticle");
	
	// save the url
	newItem.url = doc.location.href;
		
	//title
	var title1 = doc.evaluate('//div[@class="JournalAbstract"]/h1', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext();
	
	if (title1==null)
		title1 = doc.evaluate('//div[@class="JournalAbstract"]/div/h1', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext();
	
	newItem.title = Zotero.Utilities.trim(title1.textContent);
	
	// journal name
	var docTitle = doc.evaluate('//head/title', doc, nsResolver, XPathResult.ANY_TYPE, null).iterateNext().textContent;
	newItem.publicationTitle = Zotero.Utilities.trimInternal(docTitle.split('|')[2]);
		
	//authors - can be in two ways, depending on which page
	var authors = doc.evaluate('//div[@class="authors"]/a', doc, nsResolver, XPathResult.ANY_TYPE,null);
	while (author = authors.iterateNext()) {
		newItem.creators.push(Zotero.Utilities.cleanAuthor(Zotero.Utilities.trimInternal(author.textContent),"author"));
	}

	authors = doc.evaluate('//div[@class="paperauthor"]/a',doc,nsResolver,XPathResult.ANY_TYPE,null);
	
	while (author = authors.iterateNext()) {
		newItem.creators.push(Zotero.Utilities.cleanAuthor(Zotero.Utilities.trimInternal(author.textContent),"author"));
	}
	
	// abstract
	var abstract1;
	abstract1 = doc.evaluate('//div[@class="JournalAbstract"]/p',doc,nsResolver,XPathResult.ANY_TYPE,null).iterateNext();
	
	if (abstract1==null)
		abstract1 = doc.evaluate('//div[@class="JournalAbstract"]/div[@class="abstracttext"]',doc,nsResolver,XPathResult.ANY_TYPE,null).iterateNext();
	
	if (!(abstract1==null))
		newItem.abstractNote = Zotero.Utilities.trim(abstract1.textContent);
	
	// Get volume, DOI, pages and year from the citation. It can appear in various places
	
	var citation1 = doc.evaluate('//div[@class="AbstractSummary"]/p[2]',doc,nsResolver,XPathResult.ANY_TYPE,null).iterateNext(2);
	if (citation1!=null) {
		if (!citation1.textContent.match(/Citation:/))
			citation1 = null;
	}
	
	if (citation1==null) {
		citation1 = doc.evaluate('//div[@class="AbstractSummary"]/p[1]',doc,nsResolver,XPathResult.ANY_TYPE,null).iterateNext();
		if (citation1!=null) {
			if (!citation1.textContent.match(/Citation:/))
				citation1 = null;
		}
	}
	
	if (citation1==null) {
		citation1 = doc.evaluate('//div[@class="metacontainer"]/div[@class="metavalue"][2]',doc,nsResolver,XPathResult.ANY_TYPE,null).iterateNext(2);
		if (citation1!=null) {
			if (!doc.evaluate('//div[@class="metacontainer"]/div[@class="metakey"][2]',doc,nsResolver,XPathResult.ANY_TYPE,null).iterateNext(2).textContent.match(/Citation:/))
				citation1 = null;
		}
	}

	if (citation1==null)
		citation1 = doc.evaluate('//div[@class="AbstractSummary"]/p',doc,nsResolver,XPathResult.ANY_TYPE,null).iterateNext(2);
	
	if (citation1.textContent.match(/Received/))
		citation1 = doc.evaluate('//div[@class="metacontainer"]/div[@class="metavalue"]',doc,nsResolver,XPathResult.ANY_TYPE,null).iterateNext();
	
	var citation = citation1.textContent;
	
	if (!(citation==null)) {
		// DOI
		var doipart = citation.split('doi:')[1];
		if (doipart!=null)
			newItem.DOI = Zotero.Utilities.trim(doipart);
		var citation2 = citation.match(/:([0-9]*)\./);
		// If it has been recently released, there may be no page number
		if (citation2!=null)
			newItem.pages = citation2[1];
		var citation3 = citation.match(/\((20[0-9][0-9])\)/);
		if(citation3!=null)
			newItem.date = citation3[1];
	}
	
	// Look for keywords
	var keywords1 = doc.evaluate('//div[@class="AbstractSummary"]/p[1]',doc,nsResolver,XPathResult.ANY_TYPE,null).iterateNext();
	if (keywords1!=null) {
		if (!(keywords1.textContent.match(/Keywords/)))
			keywords1 = null;
	}
	var withoutKeywordsColon = 0;
	
	if (keywords1==null) {
		// In these articles, "Keyword:" appears inside  a separate div
		keywords1 = doc.evaluate('//div[@class="metacontainer"]/div[@class="metavalue"][1]',doc,nsResolver,XPathResult.ANY_TYPE,null).iterateNext();
		withoutKeywordsColon = 1;
	}
	
	if (keywords1 != null) {
	
		var keywords = keywords1.textContent;
	
	 	if(!(keywords == null)) {
		 	var keywordspart = "a,b";
	 	 	if (withoutKeywordsColon)
		 		keywordspart = keywords;
		 	else
	 			keywordspart = Zotero.Utilities.trim(keywords.split('Keywords:')[1]);
			var keywordsall = keywordspart.split(',');
			for (i=0; i<keywordsall.length; i++) {
				newItem.tags[i] = Zotero.Utilities.cleanTags(Zotero.Utilities.trim(keywordsall[i]), "");
			}
		}
	}
			
	var abbrev = doc.evaluate('//div[@class="AbstractSummary"]/p[2]/i',doc,nsResolver,XPathResult.ANY_TYPE,null).iterateNext();
	
	if (abbrev==null)
		abbrev = doc.evaluate('//div[@class="metacontainer"]/div[@class="metavalue"]/i',doc,nsResolver,XPathResult.ANY_TYPE,null).iterateNext();
	
	if (!(abbrev==null))
		newItem.journalAbbreviation = Zotero.Utilities.trim(abbrev.textContent);
	
	var vol = doc.evaluate('//div[@class="AbstractSummary"]/p[2]/b',doc,nsResolver,XPathResult.ANY_TYPE,null).iterateNext();
	if (vol==null)
		vol = doc.evaluate('//div[@class="metacontainer"]/div[@class="metavalue"]/b',doc,nsResolver,XPathResult.ANY_TYPE,null).iterateNext();
	
	if (!(vol==null))
		newItem.volume = vol.textContent;
	
	var matches = doc.body.innerHTML.match(/downloadfile.aspx.fileid=([^']*)/);

	if (matches!=null) {
		var pdfurl = 'http://www.frontiersin.org/journal/downloadfile.aspx?fileid=' + matches[1];
		newItem.attachments = [
		  {url:pdfurl, title:"Full text PDF", mimeType:"application/pdf"}
	  	];
	}	
	newItem.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.frontiersin.org/SearchServer.aspx?sq=animal",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.frontiersin.org/neuropharmacology/10.3389/fnins.2010.00191/abstract",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Thomas A. van",
						"lastName": "Essen",
						"creatorType": "author"
					},
					{
						"firstName": "Ruben S. van der",
						"lastName": "Giessen",
						"creatorType": "author"
					},
					{
						"firstName": "Sebastiaan K. E.",
						"lastName": "Koekkoek",
						"creatorType": "author"
					},
					{
						"firstName": "Frans",
						"lastName": "VanderWerf",
						"creatorType": "author"
					},
					{
						"firstName": "Chris I. De",
						"lastName": "Zeeuw",
						"creatorType": "author"
					},
					{
						"firstName": "Perry J. J. van",
						"lastName": "Genderen",
						"creatorType": "author"
					},
					{
						"firstName": "David",
						"lastName": "Overbosch",
						"creatorType": "author"
					},
					{
						"firstName": "Marcel T. G. de",
						"lastName": "Jeu",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"mefloquine",
					"gap junctions",
					"motor behavior",
					"eye-blink conditioning",
					"cerebellum"
				],
				"seeAlso": [],
				"attachments": [
					{
						"url": "http://www.frontiersin.org/journal/downloadfile.aspx?fileid=1895&jid=26&artId=2246&rId=22&cId=21",
						"title": "Full text PDF",
						"mimeType": "application/pdf"
					}
				],
				"url": "http://www.frontiersin.org/neuropharmacology/10.3389/fnins.2010.00191/pdf/abstract",
				"title": "Anti-malaria drug mefloquine induces motor learning deficits in humans",
				"publicationTitle": "Frontiers in Neuropharmacology",
				"abstractNote": "Mefloquine (a marketed anti-malaria drug) prophylaxis has a high risk of causing adverse events. Interestingly, animal studies have shown that mefloquine imposes a major deficit in motor learning skills by affecting the connexin 36 gap junctions of the inferior olive. We were therefore interested in assessing whether mefloquine might induce similar effects in humans. The main aim of this study was to investigate the effect of mefloquine on olivary-related motor performance and motor learning tasks in humans. We subjected nine participants to voluntary motor timing (dart throwing task), perceptual timing (rhythm perceptual task) and reflex timing tasks (eye-blink task) before and 24 h after the intake of mefloquine. The influence of mefloquine on motor learning was assessed by subjecting participants with and without mefloquine intake (controls: n = 11 vs mefloquine: n = 8) to an eye-blink conditioning task. Voluntary motor performance, perceptual timing, and reflex blinking were not affected by mefloquine use. However, the influence of mefloquine on motor learning was substantial; both learning speed as well as learning capacity was impaired by mefloquine use. Our data suggest that mefloquine disturbs motor learning skills. This adverse effect can have clinical as well as social clinical implications for mefloquine users. Therefore, this side-effect of mefloquine should be further investigated and recognized by clinicians.",
				"DOI": "10.3389/fnins.2010.00191",
				"pages": "191",
				"date": "2010",
				"journalAbbreviation": "Front. Neurosci",
				"volume": "4",
				"libraryCatalog": "Frontiers",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	}
]
/** END TEST CASES **/