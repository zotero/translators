{
	"translatorID": "f8765470-5ace-4a31-b4bd-4327b960ccd",
	"label": "SpringerLink",
	"creator": "Sebastian Karcher",
	"target": "https?://(www\\.)*springerlink\\.com|springerlink.metapress.com[^/]*/content/",
	"minVersion": "1.0.0b3.r1",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "g",
	"lastUpdated": "2012-03-04 15:59:29"
}

/*
Springerlink Translator
Copyright (C) 2011 Sebastian Karcher

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program. If not, see <http://www.gnu.org/licenses/>.
*/


function detectWeb(doc, url) {
  if (url.match(/content\/\?/))	return "multiple";
  if(ZU.xpathText(doc, '//div[@id="ContentSecondary"]//li/a[@href="#ui-tabs-1"]').trim()=="Book") return "bookSection";
  else 	return "journalArticle";
}


function doWeb(doc, url) {
  var arts = new Array();
  if (detectWeb(doc, url) == "multiple") {
	var items = new Object();
	var titles = doc.evaluate('//div[@id="ContentPrimary"]//p[@class="title"]/a', doc, null, XPathResult.ANY_TYPE, null);
	var title;
	while (title = titles.iterateNext()) {
	  items[title.href] = title.textContent;
		}
	Zotero.selectItems(items, function(items){
			 if(!items) {
			   return true;
			 }
			 var citationurls = new Array();
			 for (var itemurl in items) {
			 	var newurl = itemurl + "export-citation";
			   citationurls.push(newurl);
			 }
			 getpages(citationurls);
			   });

  } else {
	var citationurl = url.replace(/about\/|abstract\/|fulltext\.html|references\//, "") + "export-citation";
	getpages(citationurl);
  }
  Zotero.wait();
}

function getpages(citationurl) {
	//we work entirely from the citations page
		//Z.debug(citationurl)
  Zotero.Utilities.processDocuments(citationurl, function(doc) {
					  scrape(doc);
	}, function() { Zotero.done() });
}


function scrape (doc) {
  var newurl = doc.location.href;
  var pdfurl = newurl.replace(/export-citation/, "fulltext.pdf");
  var absurl = newurl.replace(/export-citation/, "abstract/");
  var viewstate = ZU.xpathText(doc, '//input[@name="__VIEWSTATE"]/@value').replace(/\//g, "%2F").replace(/\=/g, "%3D");
  var eventvalidate = ZU.xpathText(doc, '//input[@name="__EVENTVALIDATION"]/@value').replace(/\//g, "%2F").replace(/\+/g, "%2B").replace(/\=/g, "%3D");
 //Z.debug(eventvalidate)
  var get = newurl;
  var post = '__VIEWSTATE=' + viewstate + '&ctl00%24ctl14%24cultureList=en-us&ctl00%24ctl14%24SearchControl%24BasicSearchForTextBox=&ctl00%24ctl14%24SearchControl%24BasicAuthorOrEditorTextBox=&ctl00%24ctl14%24SearchControl%24BasicPublicationTextBox=&ctl00%24ctl14%24SearchControl%24BasicVolumeTextBox=&ctl00%24ctl14%24SearchControl%24BasicIssueTextBox=&ctl00%24ctl14%24SearchControl%24BasicPageTextBox=&ctl00%24ContentPrimary%24ctl00%24ctl00%24Export=AbstractRadioButton&ctl00%24ContentPrimary%24ctl00%24ctl00%24CitationManagerDropDownList=ReferenceManager&ctl00%24ContentPrimary%24ctl00%24ctl00%24ExportCitationButton=Export+Citation&__EVENTVALIDATION=' + eventvalidate;
  Zotero.Utilities.HTTP.doPost(get, post, function(text) {
  //Z.debug(text);
	var translator = Zotero.loadTranslator("import");
	// Calling the RIS translator
	translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
	translator.setString(text);
	translator.setHandler("itemDone", function(obj, item) {
		item.url = absurl;
		item.notes = [];
		item.attachments = [
			{url:pdfurl, title:"SpringerLink Full Text PDF", mimeType:"application/pdf"},
			{url:absurl, title:"SpringerLink Snapshot", mimeType:"text/html"}
		];
		item.complete();
	});
	translator.translate();
  });
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.springerlink.com/content/q122682q1u2r7282/abstract/",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"lastName": "Schmer",
						"firstName": "Marty",
						"creatorType": "author"
					},
					{
						"lastName": "Mitchell",
						"firstName": "Robert",
						"creatorType": "author"
					},
					{
						"lastName": "Vogel",
						"firstName": "Kenneth",
						"creatorType": "author"
					},
					{
						"lastName": "Schacht",
						"firstName": "Walter",
						"creatorType": "author"
					},
					{
						"lastName": "Marx",
						"firstName": "David",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [
					"Chemistry and Materials Science"
				],
				"seeAlso": [],
				"attachments": [
					{
						"url": "http://www.springerlink.com/content/q122682q1u2r7282/fulltext.pdf",
						"title": "SpringerLink Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"url": "http://www.springerlink.com/content/q122682q1u2r7282/abstract/",
						"title": "SpringerLink Snapshot",
						"mimeType": "text/html"
					}
				],
				"title": "Efficient Methods of Estimating Switchgrass Biomass Supplies",
				"publicationTitle": "BioEnergy Research",
				"date": "2010",
				"publisher": "Springer New York",
				"ISBN": "1939-1234",
				"ISSN": "1939-1234",
				"pages": "243-250",
				"volume": "3",
				"issue": "3",
				"url": "http://www.springerlink.com/content/q122682q1u2r7282/abstract/",
				"DOI": "10.1007/s12155-009-9070-x",
				"abstractNote": "Switchgrass ( Panicum virgatum L.) is being developed as a biofuel feedstock for the United States. Efficient and accurate methods to estimate switchgrass biomass feedstock supply within a production area will be required by biorefineries. Our main objective was to determine the effectiveness of indirect methods for estimating biomass yields and composition of switchgrass fields. Indirect measurements were conducted in eastern Nebraska from 2003 to 2007 in which switchgrass biomass yields were manipulated using three nitrogen rates (0 kg N ha -1 , 60 kg N ha -1 , and 120 kg N ha -1 ) and two harvest periods (August and post-killing frost). A modified Robel pole was used to determine visual obstruction, elongated leaf height, and canopy height measurements. Prediction models from the study showed that elongated leaf height, visual obstruction, and canopy height measurements accounted for &gt; 91%, &gt; 90%, and &gt; 82% of the variation in switchgrass biomass, respectively. Regression slopes were similar by cultivar (“Cave-in-Rock” and “Trailblazer”), harvest period, and across years indicating that a single model is applicable for determining biomass feedstock supply within a region, assuming similar harvesting methods. Sample numbers required to receive the same level of precision were as follows: elongated leaf height&lt;canopy height&lt;visual obstruction. Twenty to 30 elongated leaf height measurements in a field could predict switchgrass biomass yield within 10% of the mean with 95% confidence. Visual obstruction is recommended on switchgrass fields with low to variable stand densities while elongated leaf height measurements would be recommended on switchgrass fields with high, uniform stand densities. Incorporating an ocular device with a Robel pole provided reasonable frequency estimates of switchgrass, broadleaf weeds, and grassy weeds at the field scale.",
				"libraryCatalog": "SpringerLink",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.springerlink.com/content/?k=test",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.springerlink.com/content/n66482lu84706725/references/",
		"items": [
			{
				"itemType": "bookSection",
				"creators": [
					{
						"lastName": "Herold",
						"firstName": "H.",
						"creatorType": "author"
					},
					{
						"lastName": "Pchennikov",
						"firstName": "A.",
						"creatorType": "author"
					},
					{
						"lastName": "Streitenberger",
						"firstName": "M.",
						"creatorType": "author"
					},
					{
						"lastName": "Böllinghaus",
						"firstName": "Thomas",
						"creatorType": "contributor"
					},
					{
						"lastName": "Herold",
						"firstName": "Horst",
						"creatorType": "contributor"
					}
				],
				"notes": [],
				"tags": [
					"Chemistry and Materials Science"
				],
				"seeAlso": [],
				"attachments": [
					{
						"url": "http://www.springerlink.com/content/n66482lu84706725/fulltext.pdf",
						"title": "SpringerLink Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"url": "http://www.springerlink.com/content/n66482lu84706725/abstract/",
						"title": "SpringerLink Snapshot",
						"mimeType": "text/html"
					}
				],
				"title": "Hot Cracking Phenomena in Welds",
				"date": "2005",
				"publisher": "Springer Berlin Heidelberg",
				"ISBN": "978-3-540-27460-5",
				"ISSN": "978-3-540-27460-5",
				"pages": "328-346",
				"url": "http://www.springerlink.com/content/n66482lu84706725/abstract/",
				"DOI": "10.1007/3-540-27460-X_17",
				"abstractNote": "Referring to the ISO standardization of hot cracking test procedures with externally loaded specimens, three different and fundamental test procedures are assessed with the help of experiments and finite element analyses to find out the influence of different deformation rates on the test results of three well known stainless steels.",
				"libraryCatalog": "SpringerLink",
				"accessDate": "CURRENT_TIMESTAMP"
			}
		]
	}
]
/** END TEST CASES **/