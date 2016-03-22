{
	"translatorID": "86c35e86-3f97-4e80-9356-8209c97737c2",
	"label": "MIDAS Journals",
	"creator": "Rupert Brooks",
	"target": "(insight-journal|midasjournal|vtkjournal).org/browse/publication",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsib",
	"lastUpdated": "2015-11-10 14:10:06"
}

/*
   Midas Journal Translator
   (Includes ITKJournal,InsightJournal,VTKJournal)
   Copyright (C) 2016 Rupert Brooks
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
	if (url.match("browse/publication")) return "journalArticle";
}

function scrape(doc, url) {
   var namespace = doc.documentElement.namespaceURI; 
   var nsResolver = namespace ? function(prefix) {
	  if (prefix == 'x') return namespace; else return null; 
	   } : null; 
   var titleXPath = doc.evaluate('//*[@id="publication"]/div[@class="title"]', doc, nsResolver, XPathResult.ANY_TYPE, null); 
   var authorXPath = doc.evaluate('//*[@id="publication"]/div[@class="authors"]', doc, nsResolver, XPathResult.ANY_TYPE, null); 
   var urlXPath = doc.evaluate('//*[@id="publication"]/table/tbody/tr/td/a', doc, nsResolver, XPathResult.ANY_TYPE, null); 
   var journalXPath = doc.evaluate('//*[@id="publication"]/div[@class="journal"]/a[1]', doc, nsResolver, XPathResult.ANY_TYPE, null); 
   var issueXPath = doc.evaluate('//*[@id="publication"]/div[@class="journal"]/a[2]', doc, nsResolver, XPathResult.ANY_TYPE, null); 
   var submittedXPath = doc.evaluate('//*[@id="publication"]/div[@class="submittedby"]', doc, nsResolver, XPathResult.ANY_TYPE, null); 
   var abstractXPath = doc.evaluate('//*[@id="publication"]/div[@class="abstract"]', doc, nsResolver, XPathResult.ANY_TYPE, null); 
   var downloadAllXPath = doc.evaluate('//a[contains(text(),"Download All")]/@href', doc, nsResolver, XPathResult.ANY_TYPE, null); 
   var pdfXPath1 = doc.evaluate('//a[contains(text(),"Download Paper")]/@href', doc, nsResolver, XPathResult.ANY_TYPE, null); 
   //var pdfXPath2 = doc.evaluate('//a[contains(text(),".pdf")]/@href', doc, nsResolver, XPathResult.ANY_TYPE, null); 
 
 
   pdfhref=pdfXPath1.iterateNext();
   //if(!pdfhref) {
   //	 pdfhref=pdfXPath2.iterateNext();
   //}
   if(pdfhref) {
	  tmp=pdfhref.baseURI.split('/');
	  pdflink=tmp[0]+'//' +tmp[2]+pdfhref.value;
	  //Zotero.debug(pdflink);
   }
   datematch=new RegExp("on\\w+([0-9]+)\\-([0-9]+)\\-([0-9]+)");
   datematch=new RegExp("on +([0-9]+)\\-([0-9]+)\\-([0-9]+)");
   submittedString=submittedXPath.iterateNext().textContent;
   dateparse=datematch.exec(submittedString);
  
   authors=authorXPath.iterateNext().textContent.split(/, */);
   var newItem = new Zotero.Item("journalArticle");
   newItem.title = titleXPath.iterateNext().textContent;
   newItem.url = urlXPath.iterateNext().textContent; 
   newItem.publicationTitle = journalXPath.iterateNext().textContent;
   newItem.seriesTitle = issueXPath.iterateNext().textContent;
   newItem.abstractNote = abstractXPath.iterateNext().textContent;
   newItem.date = dateparse[3]+"-"+dateparse[1]+"-"+ dateparse[2];
   splitDownloadPath = downloadAllXPath.iterateNext().value.split('/');
   version=splitDownloadPath[splitDownloadPath.length-1]
   newItem.extra="Revision: " + version
   newItem.issue=splitDownloadPath[splitDownloadPath.length-2]

   var a=0;
   while (a<authors.length) {
   	   splitname=authors[a].split(' ');
   	   a=a+1;
   	   //Zotero.debug("splitname");
   	   //Zotero.debug(splitname);
   	   var z=1;
   	   name="";
   	   while (z<splitname.length) {
   	   	  name=name+splitname[z]+" ";
   	   	  z=z+1;
   	   }
   	   name=name+splitname[0];
   	   newItem.creators.push(Zotero.Utilities.cleanAuthor(name,"author"));
   }
   //author
   //date
   //pdf	
   if(pdfhref) {
   		newItem.attachments.push({
		   title: newItem.publicationTitle+" "+newItem.issue + " v" + version + " PDF",
		   url: pdflink,
		   mimeType: "application/pdf"
		});
   }
	newItem.attachments.push({
		title: newItem.publicationTitle+" "+newItem.issue + " v" + version +" Snapshot",
		url: url,
		mimeType:"text/html"
	});

   newItem.complete();
}

function doWeb(doc, url) {
	if(detectWeb(doc,url)=="journalArticle") {
	   var articles = new Array();
	   articles = [url];
	   Zotero.Utilities.processDocuments(articles, scrape, function(){Zotero.done();});
	   Zotero.wait();
	}
}
