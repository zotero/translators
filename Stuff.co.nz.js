{
	"translatorID": "631ff0c7-2e64-4279-a9c9-ad9518d40f2b",
	"label": "Stuff.co.nz",
	"creator": "Sopheak Hean (University of Waikato, Faculty of Education)",
	"target": "^https?://(www\\.)?stuff\\.co\\.nz/",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2014-08-23 05:56:33"
}

/*
	Stuff.co.nz Translator- Parses Stuff.co.nz articles and creates Zotero-based metadata
   Copyright (C) 2010 Sopheak Hean, University of Waikato, Faculty of Education

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

/* Stuff.co.nz does not have an ISSN because it is not a newspaper publisher.
   Stuff.co.nz is a collection of newspaper articles from around the country*/

function detectWeb(doc, url) {
	var definePath = '//div[@class="blog_content"]';
	var XpathObject = doc.evaluate(definePath, doc, null, XPathResult.ANY_TYPE, null).iterateNext();
	if (XpathObject){
		return "blogPost";
	} else {
		var definePath = '//div[@class="story_landing"]';
		var XpathObject = doc.evaluate(definePath, doc, null, XPathResult.ANY_TYPE, null).iterateNext();
		if  (XpathObject){
			return "newspaperArticle";
		}
	}
}

function scrape(doc, url) {
	var type = detectWeb(doc, url);

		var splitIntoArray;
		var fullName="";
		var emptyString =" ";
		var firstName, lastName;
	/*==========================Blog Post===========================*/
	
	if (type =="blogPost"){
	
		var newItem = new Zotero.Item('blogPost');
		newItem.url = doc.location.href;
		//newItem.title = "No Title Found";
		newItem.publicationTitle = "Stuff.co.nz";
		newItem.language = "English";

		//Get Author
		try { /*Try and Catch if encounter erro */
		
			var blogAuthor = "//div[@id='left_col']/span";
			var blogAuthorObject = doc.evaluate(blogAuthor, doc, null, XPathResult.ANY_TYPE, null).iterateNext();
				if (blogAuthorObject) {
					
					if (blogAuthorObject.textContent.replace(/\s*/g,'') ==""){
					newItem.creators =blogAuthorObject.textContent.replace(/\s*/g,'');
					}
					
					else {
						blogAuthorObject = blogAuthorObject.textContent;
						if (blogAuthorObject.match(/[\s\n\r\t]+-[\s\n\r\t]+[a-zA-Z\s\n\r\t]*/g)){
							blogAuthorObject = blogAuthorObject.replace(/([\s\n\r\t]+-[\s\n\r\t]+[a-zA-Z\s\n\r\t]*)/g, '').replace(/\bBy \b/g,'');
							splitIntoArray = blogAuthorObject.split (" ");
							for (var i = 0; i < splitIntoArray.length; i++){
								firstName = splitIntoArray[i].substring(0,1).toUpperCase();
								lastName = splitIntoArray[i].substring(1).toLowerCase();
								fullName += firstName + lastName + emptyString;
										
							}
							newItem.creators.push(Zotero.Utilities.cleanAuthor(fullName , "author"));
						}
				
					 else { 
						splitIntoArray = blogAuthorObject.replace(/\bBy \b/g,'').split (" ");
						for (var i = 0; i < splitIntoArray.length; i++){
							firstName = splitIntoArray[i].substring(0,1).toUpperCase();
							lastName = splitIntoArray[i].substring(1).toLowerCase();
							fullName += firstName + lastName + emptyString;
										
						}
					 	newItem.creators.push(Zotero.Utilities.cleanAuthor(fullName , "author"));   }
					}
				}
		} catch (err) {
			newItem.creators = [];

		}
			
		//Blog title
		var blogTitle = url.match(/\/blogs\/([^/]+)/);
		if (blogTitle){
			newItem.blogTitle = ZU.capitalizeTitle(blogTitle[1].replace(/-/g,' '), true);
		}
		newItem.shortTitle = doShortTitle(doc,url);
		newItem.title= doTitle(doc, url);
		newItem.date = doDate(doc, url);
		newItem.abstractNote = doAbstract(doc, url);
		newItem.websiteType = "Newspaper";
		newItem.attachments.push({document: doc, title:"Stuff.co.nz Snapshot"});
		newItem.complete();
	} 
	
	
	
	/* ======================Newspaper Article========================*/
	
	else  if (type =="newspaperArticle"){
	
		var newItem = new Zotero.Item('newspaperArticle');
		newItem.url = url;
		//newItem.title = "No Title Found";
		
		//Get extended publisher if there is any then replace with stuff.co.nz
		var myPublisher = '//span[@class="storycredit"]';
	
		var myPublisherObject = doc.evaluate(myPublisher , doc, null, XPathResult.ANY_TYPE, null).iterateNext();
		if (myPublisherObject) {
			var realPublisher = myPublisherObject.textContent;
			if (realPublisher.match(/\bBy[\s\n\r\t]+[a-zA-Z\s\r\t\n]*-[\s\n\r\t]*/g)){
				realPublisher = realPublisher.replace (/\bBy[\s\n\r\t]+[a-zA-Z\s\r\t\n]*-[\s\n\r\t]*/g, '').replace(/^\s*|\s*$/g, '');
				newItem.publicationTitle = realPublisher;
			} else {
				newItem.publicationTitle = "Stuff.co.nz";
			}
			
		} else {
				newItem.publicationTitle = "Stuff.co.nz";
		}
	
		newItem.language = "English";
		
		//Short Title
		newItem.shortTitle = doShortTitle(doc,url);
	
		
		//get Abstract
		newItem.abstractNote = doAbstract(doc, url);
		var authorXPath = '//span[@class="storycredit"]';
		
		var authorXPathObject = doc.evaluate(authorXPath, doc, null, XPathResult.ANY_TYPE, null).iterateNext();
		if (authorXPathObject){
			var authorArray = new Array("NZPA", "The Press", "The Dominion Post");
			authorXPathObject = authorXPathObject.textContent;
			
			if (authorXPathObject.match(/[\s\n\r\t]+-[\s\n\r\t]+\b[a-zA-Z\s\n\r\t]*|^\s+\bBy\s*/g)){
				authorXPathObject = authorXPathObject.replace(/([\s\n\r\t]+-[\s\n\r\t]+\b[a-zA-Z\s\n\r\t]*)|\b.co.nz|\b.com|(-[a-zA-Z0-9]*)/g, '');
				var authorString = authorXPathObject.replace(/^\s+\bBy\s*|^\s+\bBY\s*/g, '');
				
				if (authorString.match(/\W\band\W+/g)) {
					authorTemp = authorString.replace(/\W\band\W+/g, ', ');
					authorArray = authorTemp.split(", ");	
				} else if (!authorString.match(/\W\band\W+/g)) {
						authorArray = authorString.toLowerCase();
				}
				if ( authorArray instanceof Array ) {
					for (var i in authorArray){			
					splitIntoArray = authorArray[i].split (" ");
						for (var i = 0; i < splitIntoArray.length; i++){
							firstName = splitIntoArray[i].substring(0,1).toUpperCase();
							lastName = splitIntoArray[i].substring(1).toLowerCase();
							fullName += firstChar + lastChar + emptyString;
								
						
						}
					newItem.creators.push(Zotero.Utilities.cleanAuthor(JoinString, "author"));
					
					}
					
				} else {
					
			
					if (authorString.match(/\W\bof\W+/g)){
						authorTemp = authorString.replace (/\W\bof\W(.*)/g, '');
						splitIntoArray = authorTemp.split (" ");
						for (var i = 0; i < splitIntoArray.length; i++){
									firstName = splitIntoArray[i].substring(0,1).toUpperCase();
									lastName = splitIntoArray[i].substring(1).toLowerCase();
									fullName += firstChar + lastChar + emptyString;
							
							}
						newItem.creators.push(Zotero.Utilities.cleanAuthor(JoinString, "author"));
					
	
					} else {
						
						splitIntoArray = authorArray.split (" ");
						for (var i = 0; i < splitIntoArray.length; i++){	
							firstName = splitIntoArray[i].substring(0,1).toUpperCase();
							lastName = splitIntoArray[i].substring(1).toLowerCase();
							fullName += firstName+ lastName + emptyString;
								
							
						}
						newItem.creators.push(Zotero.Utilities.cleanAuthor(fullName, "author"));
					}
								
				}
			}  else {
				
				if (authorXPathObject.match(/[\s\n\r]+/g)){
					authorXPathObject = ZU.capitalizeTitle( authorXPathObject.trim(), true ); //.replace(/\s+/g, '-');
					newItem.creators.push(ZU.cleanAuthor(authorXPathObject, "author"));
				} else {
					newItem.creators.push(Zotero.Utilities.cleanAuthor(authorXPathObject , "author"));
				}
			}
			
		} else {
			newItem.creators = [];
		}
			
		//Title of the Article
		newItem.title= doTitle(doc, url);
		
		
		//Section of the Article 
	
		var current = '//li/a[@class="current"]';
		var currentObject = doc.evaluate(current, doc, null, XPathResult.ANY_TYPE, null).iterateNext();
		if (currentObject){
			currentObject = currentObject.textContent;
	
			var articleSection = '//li[@class="mid_nav_item"]/a';
			var articleSectionObject = doc.evaluate(articleSection , doc, null, XPathResult.ANY_TYPE, null).iterateNext();
			if (articleSectionObject){
				articleSectionObject = articleSectionObject .textContent;
				switch (articleSectionObject){
					case "National":
					case "Business":
					case "Sport":
					case "Politics":
						newItem.place= "New Zealand";
						newItem.section = currentObject;
						break;
				
					case "World":
						newItem.place= "World";
						newItem.section = currentObject; break;
					
					default:
						newItem.section = articleSectionObject;break;
				}
			} 
			var SectionType = '//li[@class="current_nav_item"]/a';
			var SectionTypeObject = doc.evaluate(SectionType, doc, null, XPathResult.ANY_TYPE, null).iterateNext();
			if (SectionType){
				
					SectionTypeObject = SectionTypeObject.textContent;
					switch (SectionTypeObject) {
						case "National":
						case "Crime":
						case "Education":
						case "Health":
						case "Politics":
						case "Environment":
						case "Business":
						
							newItem.place= "New Zealand";
							newItem.section = currentObject; break;
							
						case  "Opinion": 
						case  "Rugby": 
						case  "Soccer": 
						case  "Cricket": 
						case  "Basketball": 
						case  "Fishing": 
						case  "League":
						case  "Scoreboard":
						case  "Football":
						case  "Golf": 
						case  "Motorsport":
						case  "Netball":
						case  "Tennis":
						
							newItem.section ="Sport"; break;
						default: 
							newItem.section = SectionTypeObject; break;
					}
				}
		}
		else {
			var SectionType = '//li[@class="current_nav_item"]/a';
			var SectionTypeObject = doc.evaluate(SectionType, doc, null, XPathResult.ANY_TYPE, null).iterateNext();
			if (SectionType){
				
					SectionTypeObject = SectionTypeObject.textContent;
					
					switch (SectionTypeObject) {
						case "National":
						case "Crime":
						case "Education":
						case "Health":
						case "Politics":
						case "Environment":
						case "Business":
							newItem.place= "New Zealand";
							newItem.section = SectionTypeObject; break;
						
						default:
							newItem.section =SectionTypeObject; break;
					}
				
			}
		}
		//Snapshot of  the web page.
		newItem.attachments.push({document:doc, title:"Stuff.co.nz Snapshot"});
	 							  
		//Call Do date function to make it cleaner in scape. This way things are easier to follow.
		newItem.date = doDate(doc,url);
		newItem.complete();
		
	}
	
}


function doShortTitle(doc, url){
	var shortTitle="";
	var subTitle = '//div[@id="left_col"]/h2';
	var subTitleObject = doc.evaluate(subTitle, doc, null, XPathResult.ANY_TYPE, null).iterateNext();
	if (subTitleObject){
		 shortTitle= subTitleObject.textContent.replace(/^\s*|\s*$/g, '');
		return shortTitle;
	} else {
		return shortTitle;
	}
}

function doAbstract(doc, url){
	var abstractString=""; 
	var a= "//meta[@name='description']";
	var abs= doc.evaluate(a, doc, null, XPathResult.ANY_TYPE, null).iterateNext();
	if (abs){
		 abstractString = abs.content;
		 return abstractString;
	}
	return abstractString;
}

function doTitle(doc, url){
	var temp="";
	var getTitle = '//div[@id="left_col"]//h1';
	var getTitleObject = doc.evaluate(getTitle, doc, null, XPathResult.ANY_TYPE, null).iterateNext();
	if (getTitleObject) {
		var temp=getTitleObject.textContent.replace(/^\s*|\s*$/g, '');
		return temp;
	}
	return temp;
}

function doDate(doc, url){

	var dateXpath = "//div[@id='toolbox']/div[3]";
	var dateXpathObject = doc.evaluate(dateXpath, doc, null, XPathResult.ANY_TYPE, null).iterateNext();
	try {
		if (dateXpathObject){
			var storeDateValue = dateXpathObject.textContent.replace(/\b(Last updated )\d{0,9}:\d{0,9} /g,'');
			
			var ArrayDate = storeDateValue.split('/');
			var emptyString = " ";
			var comma = ", ";
			var DateString;
			var ArrayMonth = new Array("Jan", "Feb", "Mar", "Apr", "May", "Jun", "July", "Aug", "Sep", "Oct", "Nov", "Dec");
			var ArrayNumber = new Array("01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12");
			for (var i=0; i <ArrayNumber.length; i++){
				if (ArrayDate[1] ==ArrayNumber[i]) {
					
					ArrayNumber[i] = ArrayMonth[i];
					var month = ArrayNumber[i] + emptyString;
				}
				DateString = month + ArrayDate[0] + comma + ArrayDate[2];
				
			}
			return DateString;
		} else {
			DateString = "";
			return DateString;
		}
	}catch (err) {
		
		DateString = "";
	}
	return DateString;
}


function doWeb(doc, url) {
	scrape(doc, url);
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.stuff.co.nz/national/politics/campaign-trail/5967550/Green-party-link-to-billboard-attacks",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Green party link to billboard attacks",
				"creators": [
					{
						"firstName": "Danya",
						"lastName": "Levy",
						"creatorType": "author"
					}
				],
				"date": "Nov 15, 2011",
				"abstractNote": "The man who coordinated the vandalism of 700 National billboards says it was an attempt at \"freedom of expression.\"",
				"language": "English",
				"libraryCatalog": "Stuff.co.nz",
				"place": "New Zealand",
				"publicationTitle": "Stuff.co.nz",
				"section": "Politics",
				"url": "http://www.stuff.co.nz/national/politics/campaign-trail/5967550/Green-party-link-to-billboard-attacks",
				"attachments": [
					{
						"title": "Stuff.co.nz Snapshot"
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