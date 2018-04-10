{
	"translatorID": "86c35e86-3f97-4e80-9356-8209c97737c2",
	"label": "MIDAS Journals",
	"creator": "Rupert Brooks",
	"target": "(insight-journal|midasjournal|vtkjournal)\\.org/browse/publication",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsib",
	"lastUpdated": "2018-04-10 13:40:05"
}

/*
   Midas Journal Translator
   (Includes ITKJournal,InsightJournal,VTKJournal)
   Copyright (C) 2016-18 Rupert Brooks
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

  
   var authors=authorXPath.iterateNext().textContent.split(/, */);
   var newItem = new Zotero.Item("journalArticle");
   newItem.title = titleXPath.iterateNext().textContent;
   newItem.url = urlXPath.iterateNext().textContent; 
   newItem.publicationTitle = journalXPath.iterateNext().textContent;
   newItem.seriesTitle = issueXPath.iterateNext().textContent;
   newItem.abstractNote = abstractXPath.iterateNext().textContent;

   var datematch=new RegExp("on +([0-9]+)\\-([0-9]+)\\-([0-9]+)");
   var submittedString=submittedXPath.iterateNext().textContent;
   var dateparse=datematch.exec(submittedString);
   newItem.date = dateparse[3]+"-"+dateparse[1]+"-"+ dateparse[2];

   var splitDownloadPath = downloadAllXPath.iterateNext().value.split('/');
   var version=splitDownloadPath[splitDownloadPath.length-1];
   newItem.extra="Revision: " + version;
   newItem.issue=splitDownloadPath[splitDownloadPath.length-2]

   // This method of scraping the authors is imperfect, we end up with just
   // first initials.
   // The XML export has better information, but we would need to perform a 
   // http post to get it.
   //
   // e.g. wget http://www.insight-journal.org/browse/publication/645 --post-data='data[Export][select]=xml&data[Export][submit]=Export'

   var a=0;
   while (a<authors.length) {
   	   splitname=authors[a].split(' ');
   	   a=a+1;
   	   //Zotero.debug("splitname");
   	   //Zotero.debug(splitname);
   	   var z=1;
   	   var name="";
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
   var pdfhref=pdfXPath1.iterateNext();
   if(pdfhref) {
	    var tmp=pdfhref.baseURI.split('/');
        pdflink=tmp[0]+'//' +tmp[2]+pdfhref.value;
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

//function parseXML(text) {
//	Z.debug("in parseXML");
//	Z.debug(text)
//	text;
//}

function doWeb(doc, url) {
	if(detectWeb(doc,url)=="journalArticle") {
		scrape(doc,url);
	}
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.insight-journal.org/browse/publication/988",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Computing Bone Morphometric Feature Maps from 3-Dimensional Images",
				"creators": [
					{
						"firstName": "J.",
						"lastName": "Vimort",
						"creatorType": "author"
					},
					{
						"firstName": "M.",
						"lastName": "McCormick",
						"creatorType": "author"
					},
					{
						"firstName": "B.",
						"lastName": "Paniagua",
						"creatorType": "author"
					}
				],
				"date": "2017-11-02",
				"abstractNote": "This document describes a new remote module implemented for the Insight Toolkit (ITK), itkBoneMorphometry. This module contains bone analysis filters that compute features from N-dimensional images that represent the internal architecture of bone. The computation of the bone morphometry features in this module is based on well known methods. The two filters contained in this module are itkBoneMorphometryFeaturesFilter. which computes a set of features that describe the whole input image in the form of a feature vector, and itkBoneMorphometryFeaturesImageFilter, which computes an N-D feature map that locally describes the input image (i.e. for every voxel). itkBoneMorphometryFeaturesImageFilter can be configured based in the locality of the desired morphometry features by specifying the neighborhood size. This paper is accompanied by the source code, the  input data, the choice of parameters and the output data that we have used for validating the algorithms described. This adheres to the fundamental principle that scientific publications must facilitate reproducibility of the reported results.",
				"extra": "Revision: 1",
				"issue": "988",
				"libraryCatalog": "MIDAS Journals",
				"publicationTitle": "The Insight Journal",
				"seriesTitle": "2017 January-December",
				"url": "http://hdl.handle.net/10380/3588",
				"attachments": [
					{
						"title": "The Insight Journal 988 v1 PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "The Insight Journal 988 v1 Snapshot",
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
		"url": "http://www.insight-journal.org/browse/publication/645",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Rotational Registration of Spherical Surfaces Represented as QuadEdge Meshes",
				"creators": [
					{
						"firstName": "L.",
						"lastName": "Ibanez",
						"creatorType": "author"
					},
					{
						"firstName": "M.",
						"lastName": "Audette",
						"creatorType": "author"
					},
					{
						"firstName": "B. T.",
						"lastName": "Yeo",
						"creatorType": "author"
					},
					{
						"firstName": "P.",
						"lastName": "Golland",
						"creatorType": "author"
					}
				],
				"date": "2009-06-04",
				"abstractNote": "This document describes a contribution to the Insight Toolkit intended to support the process of registering two Meshes. The methods included here are restricted to Meshes with a Spherical geometry and topology, and with scalar values associated to their nodes.\nThis paper is accompanied with the source code, input data, parameters and output data that we used for validating the algorithm described in this paper. This adheres to the fundamental principle that scientific publications must facilitate reproducibility of the reported results.",
				"extra": "Revision: 3",
				"issue": "645",
				"libraryCatalog": "MIDAS Journals",
				"publicationTitle": "The Insight Journal",
				"seriesTitle": "2009 January - June",
				"url": "http://hdl.handle.net/10380/3063",
				"attachments": [
					{
						"title": "The Insight Journal 645 v3 PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "The Insight Journal 645 v3 Snapshot",
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
